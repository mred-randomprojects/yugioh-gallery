#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const FANDOM_GALLERY_PAGE = "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards";
const FANDOM_GALLERY_URL = "https://yugioh.fandom.com/wiki/Gallery_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards";
const FANDOM_API_URL = mediaWikiParseUrl("https://yugioh.fandom.com/api.php", FANDOM_GALLERY_PAGE);

const args = readArgs();

if (args.help) {
  printHelp();
  process.exit(0);
}

const outDir = path.resolve(projectRoot, args["out-dir"] || "assets/cards");
const manifestPath = path.resolve(projectRoot, args.manifest || "assets/cards/images.json");
const fromDir = args["from-dir"] ? path.resolve(projectRoot, String(args["from-dir"])) : "";
const timeoutMs = Number(args.timeout || 30000);
const concurrency = Math.max(1, Number(args.concurrency || 8));
const limit = args.limit ? Math.max(0, Number(args.limit)) : Infinity;
const force = Boolean(args.force);
const useThumbs = args.size === "thumb";
const dryRun = Boolean(args["dry-run"]);
const urlListPath = args["write-urls"] ? path.resolve(projectRoot, String(args["write-urls"])) : "";

try {
  await mkdir(outDir, { recursive: true });

  const html = await fetchGalleryHtml();
  const galleryCards = dedupeByNumber(parseGalleryHtml(html));
  if (galleryCards.length < 700) {
    if (args.debug) {
      const debugPath = path.join(projectRoot, "debug", "fandom-gallery-download-source.html");
      await mkdir(path.dirname(debugPath), { recursive: true });
      await writeFile(debugPath, html, "utf8");
      console.log(`Saved ${path.relative(projectRoot, debugPath)} for parser debugging.`);
    }
    throw new Error(`only ${galleryCards.length} gallery images were parsed`);
  }

  const selectedCards = galleryCards.slice(0, limit);
  if (fromDir) {
    const manifest = await buildManifestFromDirectory(selectedCards, fromDir);
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Wrote ${path.relative(projectRoot, manifestPath)}.`);
    console.log(`Manifest entries: ${manifest.cards.length}`);
    console.log(`Missing local files: ${selectedCards.length - manifest.cards.length}`);
    process.exit(manifest.cards.length === selectedCards.length ? 0 : 1);
  }

  if (urlListPath) {
    const urls = selectedCards.map((card) => useThumbs ? card.image : originalImageUrl(card.image));
    await mkdir(path.dirname(urlListPath), { recursive: true });
    await writeFile(urlListPath, `${urls.join("\n")}\n`, "utf8");
    console.log(`Wrote ${path.relative(projectRoot, urlListPath)} with ${urls.length} image URLs.`);
    process.exit(0);
  }

  if (dryRun) {
    console.log(`Parsed ${galleryCards.length} gallery images.`);
    selectedCards.slice(0, 10).forEach((card) => {
      console.log(`#${card.numberText} ${card.name} -> ${card.image}`);
    });
    process.exit(0);
  }

  const manifestCards = new Map();
  const failures = [];
  let downloaded = 0;
  let skipped = 0;

  await runPool(selectedCards, concurrency, async (card, index) => {
    const sourceImage = useThumbs ? card.image : originalImageUrl(card.image);
    const fileName = `${card.numberText}-${slug(card.name)}${extensionFromUrl(card.image)}`;
    const absolutePath = path.join(outDir, fileName);
    const relativePath = toPosixPath(path.relative(projectRoot, absolutePath));

    try {
      if (!force && await fileExists(absolutePath)) {
        skipped += 1;
      } else {
        await downloadFile(sourceImage, absolutePath);
        downloaded += 1;
      }

      manifestCards.set(card.number, {
        number: card.number,
        numberText: card.numberText,
        name: card.name,
        image: relativePath,
        sourceImage,
      });
    } catch (error) {
      failures.push(`#${card.numberText} ${card.name}: ${error.message}`);
    }

    const completed = index + 1;
    if (completed % 25 === 0 || completed === selectedCards.length) {
      console.log(`Processed ${completed}/${selectedCards.length} images...`);
    }
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: FANDOM_GALLERY_URL,
    cards: Array.from(manifestCards.values()).sort((a, b) => a.number - b.number),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Wrote ${path.relative(projectRoot, manifestPath)}.`);
  console.log(`Parsed: ${galleryCards.length}`);
  console.log(`Manifest entries: ${manifest.cards.length}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped existing: ${skipped}`);

  if (failures.length) {
    console.log(`Failed: ${failures.length}`);
    failures.slice(0, 20).forEach((failure) => console.log(`  ${failure}`));
    if (failures.length > 20) {
      console.log(`  ...and ${failures.length - 20} more`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Image download failed: ${error.message}`);
  process.exitCode = 1;
}

async function buildManifestFromDirectory(cards, imageDir) {
  const files = await listFiles(imageDir);
  const filesByBase = new Map(files.map((file) => [baseNameWithoutExtension(file), file]));
  const manifestCards = [];

  for (const card of cards) {
    const sourceBase = sourceImageBaseName(card.image);
    const filePath = filesByBase.get(sourceBase);
    if (!filePath) continue;
    manifestCards.push({
      number: card.number,
      numberText: card.numberText,
      name: card.name,
      image: toPosixPath(path.relative(projectRoot, filePath)),
      sourceImage: card.image,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    source: FANDOM_GALLERY_URL,
    cards: manifestCards.sort((a, b) => a.number - b.number),
  };
}

async function listFiles(directory) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directory, entry.name));
}

function baseNameWithoutExtension(value) {
  return path.basename(value).replace(/\.[^.]+$/g, "");
}

function sourceImageBaseName(value) {
  const pathname = decodeURIComponent(new URL(value).pathname);
  const match = pathname.match(/\/([^/]+\.(?:png|jpe?g|webp|gif))\/revision\//i);
  return baseNameWithoutExtension(match ? match[1] : pathname);
}

async function fetchGalleryHtml() {
  if (args.html) {
    return readFile(path.resolve(projectRoot, String(args.html)), "utf8");
  }

  try {
    const text = await fetchText(FANDOM_API_URL, "application/json,text/html,*/*");
    const data = JSON.parse(text);
    const html = data?.parse?.text?.["*"];
    if (html) return html;
  } catch (error) {
    console.log(`Fandom API fetch failed, trying direct page: ${error.message}`);
  }

  return fetchText(FANDOM_GALLERY_URL, "text/html,*/*");
}

async function fetchText(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept,
        "user-agent": "Mozilla/5.0 ReshefCardArchiveImageDownloader/1.0",
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}; ${text.slice(0, 120).replace(/\s+/g, " ")}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function downloadFile(url, outPath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*",
        referer: "https://yugioh.fandom.com/",
        "user-agent": "Mozilla/5.0 ReshefCardArchiveImageDownloader/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 512) {
      throw new Error(`downloaded file was unexpectedly small (${bytes.length} bytes)`);
    }
    await writeFile(outPath, bytes);
  } finally {
    clearTimeout(timer);
  }
}

function parseGalleryHtml(html) {
  const cards = [];
  for (const block of splitGalleryBlocks(html)) {
    const alt = decodeEntities(firstMatch(block, /\balt=["']([^"']+)["']/i));
    const caption = stripTags(firstMatch(block, /<div\b[^>]*class=["'][^"']*lightbox-caption[^"']*["'][^>]*>([\s\S]*?)<\/div>/i));
    const plain = stripTags(`${alt} ${caption || block}`);
    const number = parseNumber(firstMatch(plain, /#\s*(\d{1,3})/));
    if (!number) continue;

    const quotedName = firstMatch(alt, /"([^"]+)"/) || firstMatch(plain, /"([^"]+)"/);
    const image = extractImageUrl(block);
    if (!image) continue;

    cards.push({
      number,
      numberText: padNumber(number),
      name: cleanName(quotedName || plain.replace(/#\s*\d{1,3}/, "")),
      image,
    });
  }
  return cards.sort((a, b) => a.number - b.number);
}

function splitGalleryBlocks(html) {
  const blocks = [];
  const gallerybox = /<(?:li|div)\b[^>]*class=["'][^"']*gallerybox[^"']*["'][^>]*>[\s\S]*?(?=<(?:li|div)\b[^>]*class=["'][^"']*gallerybox[^"']*["']|<\/ul>|$)/gi;
  for (const match of html.matchAll(gallerybox)) {
    blocks.push(match[0]);
  }
  if (blocks.length) return blocks;

  const fandomItem = /<div\b[^>]*class=["'][^"']*wikia-gallery-item[^"']*["'][^>]*>[\s\S]*?(?=<div\b[^>]*class=["'][^"']*wikia-gallery-item[^"']*["']|<\/div>\s*<table\b|$)/gi;
  for (const match of html.matchAll(fandomItem)) {
    blocks.push(match[0]);
  }
  if (blocks.length) return blocks;

  const linkedImages = /<a\b[^>]*title=["']Image:\s*#\d{1,3}[\s\S]*?(?=<a\b[^>]*title=["']Image:\s*#\d{1,3}|$)/gi;
  for (const match of html.matchAll(linkedImages)) {
    blocks.push(match[0]);
  }
  return blocks;
}

function extractImageUrl(block) {
  const candidates = [];
  const attrPattern = /\b(?:data-src|src|href|data-image-url|data-full-url|data-srcset|srcset)=["']([^"']+)["']/gi;
  for (const match of block.matchAll(attrPattern)) {
    const value = decodeEntities(match[1]).replace(/\\\//g, "/");
    if (/srcset/i.test(match[0])) {
      candidates.push(...value.split(",").map((item) => item.trim().split(/\s+/)[0]));
    } else {
      candidates.push(value);
    }
  }
  candidates.push(...Array.from(block.matchAll(/https?:\/\/static\.wikia\.nocookie\.net\/yugioh\/images\/[^\s"'<>]+/gi), (match) => match[0]));

  return candidates
    .map((value) => decodeEntities(value).replace(/\\\//g, "/"))
    .filter((value) => /^https?:\/\//i.test(value))
    .filter((value) => /static\.wikia\.nocookie\.net\/yugioh\/images\//i.test(value))
    .filter((value) => /\.(?:png|jpe?g|webp|gif)(?:\/|$|\?)/i.test(value))
    .find(Boolean) || "";
}

function originalImageUrl(value) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/revision\/latest\/(?:scale-to-width-down|smart|fixed-aspect-ratio-down)\/\d+.*$/i, "/revision/latest");
  return url.toString();
}

function extensionFromUrl(value) {
  const pathname = decodeURIComponent(new URL(value).pathname);
  const match = pathname.match(/\.(png|jpe?g|webp|gif)(?:\/|$)/i);
  return match ? `.${match[1].toLowerCase().replace("jpeg", "jpg")}` : ".png";
}

async function runPool(items, size, worker) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function fileExists(filePath) {
  try {
    const result = await stat(filePath);
    return result.isFile() && result.size > 0;
  } catch {
    return false;
  }
}

function dedupeByNumber(cards) {
  const byNumber = new Map();
  for (const card of cards) {
    if (!card.number || byNumber.has(card.number)) continue;
    byNumber.set(card.number, card);
  }
  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}

function mediaWikiParseUrl(base, page) {
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    prop: "text",
    page,
    disableeditsection: "1",
    disablelimitreport: "1",
  });
  return `${base}?${params.toString()}`;
}

function stripTags(html) {
  return decodeEntities(String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function firstMatch(value, regex) {
  const match = String(value || "").match(regex);
  return match ? match[1] : "";
}

function cleanName(value) {
  return normalizeText(value)
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");
}

function normalizeText(value) {
  return decodeEntities(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function padNumber(number) {
  return String(number).padStart(3, "0");
}

function slug(value) {
  const text = normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (text || "card").slice(0, 90);
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function readArgs() {
  const parsed = {};
  for (const arg of process.argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    parsed[key] = rest.length ? rest.join("=") : true;
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node scripts/download-images.mjs
  node scripts/download-images.mjs --limit=10
  node scripts/download-images.mjs --html=debug/fandom-gallery-download-source.html --dry-run
  node scripts/download-images.mjs --html=debug/fandom-gallery-download-source.html --write-urls=assets/cards/image-urls.txt
  node scripts/download-images.mjs --html=debug/fandom-gallery-download-source.html --from-dir=assets/cards/downloaded
  node scripts/download-images.mjs --force

Options:
  --html=debug/fandom-gallery-download-source.html
  --from-dir=assets/cards/downloaded
  --write-urls=assets/cards/image-urls.txt
  --out-dir=assets/cards
  --manifest=assets/cards/images.json
  --limit=10
  --concurrency=8
  --timeout=30000
  --size=original|thumb
  --dry-run
  --debug
  --force
`);
}
