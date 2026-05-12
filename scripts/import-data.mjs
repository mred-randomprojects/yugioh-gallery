#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localYugipediaListPath = path.join(projectRoot, "List of Yu-Gi-Oh! Reshef of Destruction cards - Yugipedia.html");
const defaultImageManifestPath = path.join(projectRoot, "assets", "cards", "images.json");

const PAGES = {
  yugipediaGallery: "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards_(European_English)",
  yugipediaList: "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards",
  fandomGallery: "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards",
  fandomList: "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards",
};

const SOURCES = {
  "local-list": {
    kind: "local-html",
    label: "Downloaded Yugipedia stats table",
    origin: "https://yugipedia.com",
    listKind: "local-html",
    listPath: localYugipediaListPath,
    missingImagesAllowed: true,
  },
  "yugipedia-gallery-local-list": {
    kind: "api",
    label: "Yugipedia European gallery API + downloaded Yugipedia stats table",
    origin: "https://yugipedia.com",
    galleryOrigin: "https://yugipedia.com",
    galleryKind: "api",
    galleryUrl: mediaWikiParseUrl("https://yugipedia.com/api.php", PAGES.yugipediaGallery),
    listKind: "local-html",
    listPath: localYugipediaListPath,
  },
  "fandom-gallery-local-list": {
    kind: "api",
    label: "Fandom gallery API + downloaded Yugipedia stats table",
    origin: "https://yugioh.fandom.com",
    galleryOrigin: "https://yugioh.fandom.com",
    galleryKind: "api",
    galleryUrl: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", PAGES.fandomGallery),
    listKind: "local-html",
    listPath: localYugipediaListPath,
  },
  "yugipedia-gallery-fandom-list": {
    kind: "api",
    label: "Yugipedia European gallery + Fandom stats API",
    origin: "https://yugipedia.com",
    galleryOrigin: "https://yugipedia.com",
    galleryUrl: mediaWikiParseUrl("https://yugipedia.com/api.php", PAGES.yugipediaGallery),
    listUrl: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", PAGES.fandomList),
  },
  "yugipedia-api": {
    kind: "api",
    label: "Yugipedia MediaWiki API",
    origin: "https://yugipedia.com",
    galleryUrl: mediaWikiParseUrl("https://yugipedia.com/api.php", PAGES.yugipediaGallery),
    listUrl: mediaWikiParseUrl("https://yugipedia.com/api.php", PAGES.yugipediaList),
  },
  "fandom-api": {
    kind: "api",
    label: "Fandom MediaWiki API",
    origin: "https://yugioh.fandom.com",
    galleryUrl: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", PAGES.fandomGallery),
    listUrl: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", PAGES.fandomList),
  },
  "yugipedia-reader": {
    kind: "reader",
    label: "Yugipedia via Jina Reader",
    origin: "https://yugipedia.com",
    galleryUrl: `https://r.jina.ai/https://yugipedia.com/wiki/${encodeURIComponent(PAGES.yugipediaGallery).replace(/%2F/g, "/")}`,
    listUrl: `https://r.jina.ai/https://yugipedia.com/wiki/${encodeURIComponent(PAGES.yugipediaList).replace(/%2F/g, "/")}`,
  },
  "fandom-reader": {
    kind: "reader",
    label: "Fandom via Jina Reader",
    origin: "https://yugioh.fandom.com",
    galleryUrl: "https://r.jina.ai/https://yugioh.fandom.com/wiki/Gallery_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
    listUrl: "https://r.jina.ai/https://yugioh.fandom.com/wiki/List_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
  },
};

const AUTO_ORDER = ["local-list", "fandom-gallery-local-list", "yugipedia-gallery-local-list", "yugipedia-gallery-fandom-list", "fandom-api", "yugipedia-api", "yugipedia-reader", "fandom-reader"];
const args = readArgs();

if (args.help) {
  printHelp();
  process.exit(0);
}

const sourceName = args.source || "auto";
const outPath = path.resolve(projectRoot, args.out || "data.js");
const csvPath = args.csv ? path.resolve(projectRoot, String(args.csv)) : null;
const imageManifestPath = args.images ? path.resolve(projectRoot, String(args.images)) : defaultImageManifestPath;
const allowMissingImages = Boolean(args["allow-missing-images"]);

try {
  const result = sourceName === "auto"
    ? await importAuto()
    : await importFromSource(sourceName);

  const payload = {
    cards: result.cards,
  };

  await writeFile(outPath, `window.RESHEF_CARD_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  if (csvPath) {
    await writeFile(csvPath, toCsv(result.cards), "utf8");
  }

  console.log(`Wrote ${path.relative(projectRoot, outPath)} from ${result.source.label}.`);
  if (csvPath) {
    console.log(`Wrote ${path.relative(projectRoot, csvPath)}.`);
  }
  console.log(`Cards: ${result.cards.length}`);
  console.log(`Cards with stats: ${result.statCoverage}`);
  console.log(`Cards with images: ${result.imageCoverage}`);
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  process.exitCode = 1;
}

async function importAuto() {
  const failures = [];
  for (const key of AUTO_ORDER) {
    try {
      console.log(`Trying ${key}...`);
      return await importFromSource(key);
    } catch (error) {
      failures.push(`${key}: ${error.message}`);
      console.log(`  failed: ${error.message}`);
    }
  }
  throw new Error(`No source worked.\n${failures.join("\n")}`);
}

async function importFromSource(sourceKey) {
  const source = SOURCES[sourceKey];
  if (!source) {
    throw new Error(`Unknown --source=${sourceKey}. Use one of: auto, ${Object.keys(SOURCES).join(", ")}`);
  }

  const [galleryBody, listBody] = await Promise.all([
    source.galleryUrl || source.galleryPath ? readSourceBody(source, "gallery") : "",
    readSourceBody(source, "list"),
  ]);

  const galleryCards = mergeGalleryCards(
    galleryBody ? parseGallery(galleryBody, source.galleryOrigin || source.origin) : [],
    await readImageManifest(imageManifestPath),
  );
  const statCards = parseStats(listBody);
  const cards = mergeCards(galleryCards, statCards);
  const statCoverage = cards.filter((card) => {
    return isFiniteNumber(card.cost) || isFiniteNumber(card.atk) || isFiniteNumber(card.def);
  }).length;
  const imageCoverage = cards.filter((card) => card.image).length;

  if (cards.length < 700) {
    throw new Error(`only ${cards.length} cards were parsed`);
  }
  if (statCoverage < 700) {
    throw new Error(`only ${statCoverage} cards had parsed stats`);
  }
  if (!allowMissingImages && !source.missingImagesAllowed && imageCoverage < 700) {
    throw new Error(`only ${imageCoverage} cards had image URLs; retry another source or pass --allow-missing-images`);
  }

  return {
    sourceKey,
    source,
    cards,
    statCoverage,
    imageCoverage,
    imageManifestPath: galleryCards.some((card) => isLocalImagePath(card.image)) ? imageManifestPath : "",
  };
}

async function readSourceBody(source, role) {
  const kind = source[`${role}Kind`] || source.kind;
  const filePath = source[`${role}Path`];
  if (kind === "local-html" || filePath) {
    if (!filePath) {
      throw new Error(`${role} source is missing a local path`);
    }
    return readFile(filePath, "utf8");
  }
  return fetchBody(source[`${role}Url`], kind);
}

async function readImageManifest(manifestPath) {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!Array.isArray(manifest.cards)) return [];
    return manifest.cards.map((card) => {
      const number = parseNumber(card.number);
      return toGalleryCard(number, card.name || "", card.image || "");
    }).filter((card) => card.number && card.image);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function mergeGalleryCards(primaryCards, localCards) {
  const byNumber = new Map();
  for (const card of primaryCards) {
    if (card.number) byNumber.set(card.number, card);
  }
  for (const card of localCards) {
    if (!card.number) continue;
    byNumber.set(card.number, {
      ...(byNumber.get(card.number) || {}),
      ...card,
      image: card.image,
    });
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

async function fetchBody(url, kind) {
  const text = await fetchText(url);
  if (kind !== "api") return text;
  const data = JSON.parse(text);
  const html = data?.parse?.text?.["*"];
  if (!html) {
    throw new Error(data?.error?.info || "MediaWiki API response did not include parse HTML");
  }
  return html;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(args.timeout || 20000));
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 ReshefCardArchiveLocalImporter/1.0",
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

function parseGallery(text, origin) {
  const cards = /<[^>]+>/.test(text)
    ? parseGalleryHtml(text, origin)
    : parseGalleryMarkdown(text, origin);
  return dedupeByNumber(cards).sort((a, b) => a.number - b.number);
}

function parseGalleryHtml(html, origin) {
  const blocks = splitGalleryBlocks(html);
  const cards = [];
  for (const block of blocks) {
    const caption = firstMatch(block, /<div\b[^>]*class=["'][^"']*gallerytext[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || block;
    const plain = stripTags(caption);
    const number = parseNumber(firstMatch(plain, /#\s*(\d{1,3})/));
    if (!number) continue;

    const quotedName = firstMatch(plain, /"([^"]+)"/);
    const anchors = extractAnchorTexts(caption).filter((value) => value && !value.startsWith("#") && !/^file:/i.test(value));
    const name = cleanName(quotedName || anchors[anchors.length - 1] || plain.replace(/#\s*\d{1,3}/, ""));
    const image = extractImageUrl(block, origin);

    cards.push(toGalleryCard(number, name, image));
  }
  return cards;
}

function splitGalleryBlocks(html) {
  const blocks = [];
  const gallerybox = /<(?:li|div)\b[^>]*class=["'][^"']*gallerybox[^"']*["'][^>]*>[\s\S]*?(?=<(?:li|div)\b[^>]*class=["'][^"']*gallerybox[^"']*["']|<\/ul>|$)/gi;
  for (const match of html.matchAll(gallerybox)) {
    blocks.push(match[0]);
  }
  if (blocks.length) return blocks;

  for (const match of html.matchAll(/<div\b[^>]*class=["'][^"']*gallerytext[^"']*["'][^>]*>[\s\S]*?<\/div>/gi)) {
    blocks.push(match[0]);
  }
  return blocks;
}

function parseGalleryMarkdown(text, origin) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const cards = [];
  let pendingImage = "";
  for (let i = 0; i < lines.length; i += 1) {
    const image = firstMatch(lines[i], /!\[[^\]]*\]\(([^)]+)\)/);
    if (image) {
      pendingImage = normalizeImageUrl(image, origin);
      continue;
    }
    const number = parseNumber(firstMatch(lines[i], /^#\s*(\d{1,3})$/));
    if (!number) continue;
    const next = lines.slice(i + 1, i + 5).find((line) => !/^#\s*\d{1,3}$/.test(line)) || "";
    const name = cleanName(firstMatch(next, /"([^"]+)"/) || next);
    cards.push(toGalleryCard(number, name, pendingImage));
    pendingImage = "";
  }
  return cards;
}

function parseStats(text) {
  const cards = /<[^>]+>/.test(text)
    ? parseStatsHtml(text)
    : parseStatsMarkdown(text);
  return cards.filter((card) => card.name);
}

function parseStatsHtml(html) {
  const tables = Array.from(html.matchAll(/<table\b[\s\S]*?<\/table>/gi), (match) => match[0]);
  const cards = [];
  for (const table of tables) {
    const text = stripTags(table);
    if (!hasStatsHeaders(text)) {
      continue;
    }
    cards.push(...parseStatsHtmlTable(table));
  }
  return cards;
}

function parseStatsHtmlTable(table) {
  const rows = Array.from(table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi), (match) => match[0]);
  const headerRowIndex = rows.findIndex((row) => {
    return hasStatsHeaders(stripTags(row));
  });
  if (headerRowIndex === -1) return [];

  const headers = extractCells(rows[headerRowIndex]).map((value) => value.toLowerCase());
  const index = headerIndex(headers);

  return rows.slice(headerRowIndex + 1).map((row) => {
    return statsCardFromCells(extractCells(row), index);
  }).filter(Boolean);
}

function parseStatsMarkdown(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerRowIndex = lines.findIndex((line) => {
    return line.includes("|") && hasStatsHeaders(line);
  });
  if (headerRowIndex === -1) return [];

  const headers = splitMarkdownRow(lines[headerRowIndex]).map((value) => value.toLowerCase());
  const index = headerIndex(headers);
  const cards = [];

  for (const line of lines.slice(headerRowIndex + 1)) {
    if (!line.includes("|")) continue;
    if (/^[-|\s:]+$/.test(line)) continue;
    const card = statsCardFromCells(splitMarkdownRow(line), index);
    if (card) cards.push(card);
  }
  return cards;
}

function headerIndex(headers) {
  return {
    number: findHeader(headers, ["#", "number", "card #", "no.", "no"]),
    card: findHeader(headers, ["card", "name"]),
    rodName: findHeader(headers, ["rod name"]),
    cost: findHeader(headers, ["deck cost", "cost", "dc"]),
    cardType: findHeader(headers, ["card type"]),
    attribute: findHeader(headers, ["alignment", "attribute", "element"]),
    type: findHeader(headers, ["type"]),
    level: findHeader(headers, ["level", "stars"]),
    atk: findHeader(headers, ["atk", "attack"]),
    def: findHeader(headers, ["def", "defense"]),
    password: findHeader(headers, ["password"]),
    status: findHeader(headers, ["status"]),
  };
}

function statsCardFromCells(cells, index) {
  if (cells.length < 2) return null;
  const value = (key) => {
    const i = index[key];
    return i >= 0 ? normalizeText(cells[i] || "") : "";
  };
  const rawName = value("card");
  const rodName = value("rodName");
  const name = cleanName(rawName || rodName);
  if (!name || /^card$/i.test(name)) return null;
  const cost = parseNumber(value("cost"));
  const type = normalizeType(value("type") || value("cardType"));

  return {
    number: parseNumber(value("number")),
    numberText: null,
    name,
    rodName: rodName && rodName !== name ? cleanName(rodName) : "",
    image: "",
    cost,
    duelistLevel: cost,
    attribute: normalizeAttribute(value("attribute")),
    type,
    level: parseNumber(value("level")),
    atk: parseNumber(value("atk")),
    def: parseNumber(value("def")),
    password: value("password"),
    status: value("status") || "Unlimited",
  };
}

function mergeCards(galleryCards, statCards) {
  const statsByNumber = new Map();
  const statsByName = new Map();
  for (const card of statCards) {
    if (card.number) statsByNumber.set(card.number, card);
    statsByName.set(nameKey(card.name), card);
    if (card.rodName) statsByName.set(nameKey(card.rodName), card);
  }

  const merged = galleryCards.map((galleryCard) => {
    const stats = statsByNumber.get(galleryCard.number) || statsByName.get(nameKey(galleryCard.name)) || {};
    return finalizeCard({
      ...galleryCard,
      ...stats,
      number: galleryCard.number,
      numberText: galleryCard.numberText,
      name: galleryCard.name || stats.name || `Card #${galleryCard.numberText}`,
      image: galleryCard.image || stats.image || "",
    });
  });

  const existingNumbers = new Set(merged.map((card) => card.number).filter(Boolean));
  for (const statCard of statCards) {
    if (statCard.number && existingNumbers.has(statCard.number)) continue;
    merged.push(finalizeCard(statCard));
  }

  return merged.sort((a, b) => a.number - b.number);
}

function finalizeCard(card) {
  const number = parseNumber(card.number);
  const cost = parseNumber(card.cost);
  const atk = parseNumber(card.atk);
  const def = parseNumber(card.def);
  const level = parseNumber(card.level);
  const finalized = {
    number,
    numberText: card.numberText || padNumber(number || 0),
    name: cleanName(card.name),
    rodName: cleanName(card.rodName || ""),
    image: card.image || "",
    cost,
    duelistLevel: parseNumber(card.duelistLevel) ?? cost,
    attribute: normalizeAttribute(card.attribute),
    type: normalizeType(card.type),
    level,
    atk,
    def,
    password: normalizeText(card.password || ""),
    status: normalizeText(card.status || "Unknown"),
  };
  finalized.kind = isMonster(finalized) ? "monster" : "spelltrap";
  return finalized;
}

function toGalleryCard(number, name, image) {
  return {
    number,
    numberText: padNumber(number),
    name,
    image,
  };
}

function dedupeByNumber(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!card.number || map.has(card.number)) continue;
    map.set(card.number, card);
  }
  return Array.from(map.values());
}

function extractCells(rowHtml) {
  return Array.from(rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi), (match) => stripTags(match[1]));
}

function hasStatsHeaders(text) {
  return /\b(?:Deck\s+Cost|DC)\b/i.test(text) && /\bATK\b/i.test(text) && /\bDEF\b/i.test(text);
}

function extractAnchorTexts(html) {
  return Array.from(html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi), (match) => stripTags(match[1]));
}

function extractImageUrl(html, origin) {
  const imgTag = firstMatch(html, /(<img\b[^>]*>)/i);
  if (!imgTag) return "";
  const direct = getAttr(imgTag, "data-src") || getAttr(imgTag, "src");
  const srcset = getAttr(imgTag, "data-srcset") || getAttr(imgTag, "srcset");
  const fromSrcset = srcset ? srcset.split(",")[0]?.trim().split(/\s+/)[0] : "";
  return normalizeImageUrl(direct || fromSrcset || "", origin);
}

function getAttr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function splitMarkdownRow(line) {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => {
    return cleanName(cell.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, ""));
  });
}

function stripTags(html) {
  return decodeEntities(String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|tr|td|th|h\d)>/gi, " ")
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

function findHeader(headers, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const exact = headers.findIndex((header) => wanted.includes(header));
  if (exact !== -1) return exact;
  return headers.findIndex((header) => wanted.some((name) => header.includes(name)));
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

function normalizeAttribute(value) {
  const normalized = normalizeText(value);
  const aliases = {
    Black: "Dark",
    Ground: "Earth",
    White: "Light",
  };
  return aliases[normalized] || normalized;
}

function normalizeType(value) {
  return normalizeText(value)
    .replace(/^Dargon$/i, "Dragon")
    .replace(/^Beasat Warrior$/i, "Beast-Warrior")
    .replace(/^Beast Warrior$/i, "Beast-Warrior")
    .replace(/^Wined Bast$/i, "Winged Beast")
    .replace(/^Soldier$/i, "Warrior");
}

function normalizeImageUrl(value, origin = "") {
  const url = normalizeText(value);
  if (!url) return "";
  if (isLocalImagePath(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return url;
}

function isLocalImagePath(value) {
  return /^(?:\.?\/)?assets\/cards\//.test(normalizeText(value));
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function isFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

function padNumber(number) {
  return String(number).padStart(3, "0");
}

function isMonster(card) {
  return isFiniteNumber(card.atk) || isFiniteNumber(card.def) || isFiniteNumber(card.level);
}

function nameKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function toCsv(cards) {
  const columns = [
    ["number", "Number"],
    ["numberText", "Number Text"],
    ["name", "Name"],
    ["rodName", "ROD Name"],
    ["cost", "Cost"],
    ["duelistLevel", "Duelist Level"],
    ["attribute", "Alignment"],
    ["type", "Type"],
    ["level", "Card Level"],
    ["atk", "ATK"],
    ["def", "DEF"],
    ["password", "Password"],
    ["status", "Status"],
    ["kind", "Kind"],
    ["image", "Image"],
  ];
  const rows = [
    columns.map(([, label]) => label),
    ...cards.map((card) => columns.map(([key]) => card[key] ?? "")),
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
  node scripts/import-data.mjs
  node scripts/import-data.mjs --source=local-list --csv=reshef-cards.csv
  node scripts/import-data.mjs --source=local-list --images=assets/cards/images.json
  node scripts/import-data.mjs --source=yugipedia-gallery-fandom-list
  node scripts/import-data.mjs --source=yugipedia-api
  node scripts/import-data.mjs --source=fandom-api
  node scripts/import-data.mjs --source=yugipedia-reader --allow-missing-images

Options:
  --source=auto|local-list|fandom-gallery-local-list|yugipedia-gallery-local-list|yugipedia-gallery-fandom-list|yugipedia-api|fandom-api|yugipedia-reader|fandom-reader
  --out=data.js
  --csv=reshef-cards.csv
  --images=assets/cards/images.json
  --timeout=20000
  --allow-missing-images
`);
}
