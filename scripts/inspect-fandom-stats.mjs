#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const args = readArgs();
const timeoutMs = Number(args.timeout || 20000);
const limit = Number(args.limit || 10);
const save = Boolean(args.save);
const url = mediaWikiParseUrl(
  "https://yugioh.fandom.com/api.php",
  "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards",
);

console.log(`Fetching Fandom stats API`);
console.log(`URL: ${url}`);
console.log(`Timeout: ${timeoutMs}ms\n`);

try {
  const { status, statusText, headers, text } = await fetchText(url);
  const data = JSON.parse(text);
  const html = data?.parse?.text?.["*"] || "";
  const title = data?.parse?.title || "(missing title)";
  const tables = Array.from(html.matchAll(/<table\b[\s\S]*?<\/table>/gi), (match) => match[0]);
  const allParsed = parseStatsHtml(html);

  console.log("Response");
  console.log(`  HTTP: ${status} ${statusText}`);
  console.log(`  Content-Type: ${headers.get("content-type") || "unknown"}`);
  console.log(`  JSON bytes: ${text.length.toLocaleString()}`);
  console.log(`  Parsed title: ${title}`);
  console.log(`  HTML bytes: ${html.length.toLocaleString()}`);
  console.log(`  <table> count: ${tables.length}`);
  console.log(`  "Deck Cost" occurrences: ${countMatches(html, /Deck\s+Cost/gi)}`);
  console.log(`  "ATK" occurrences: ${countMatches(html, /\bATK\b/gi)}`);
  console.log(`  "DEF" occurrences: ${countMatches(html, /\bDEF\b/gi)}\n`);

  console.log("Candidate Tables");
  tables.forEach((table, index) => {
    const rows = Array.from(table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi), (match) => match[0]);
    const textOnly = stripTags(table);
    const hasStatsHeader = /Deck\s+Cost/i.test(textOnly) && /\bATK\b/i.test(textOnly) && /\bDEF\b/i.test(textOnly);
    if (!hasStatsHeader && !args.all) return;
    const headerRowIndex = rows.findIndex((row) => {
      const rowText = stripTags(row);
      return /Deck\s+Cost/i.test(rowText) && /\bATK\b/i.test(rowText) && /\bDEF\b/i.test(rowText);
    });
    const headerCells = headerRowIndex >= 0 ? extractCells(rows[headerRowIndex]) : [];
    const parsed = headerRowIndex >= 0 ? parseStatsHtmlTable(table) : [];
    const rowCellShape = rows.slice(Math.max(0, headerRowIndex + 1), Math.max(0, headerRowIndex + 6)).map((row) => extractCells(row).length);

    console.log(`  Table ${index}`);
    console.log(`    bytes: ${table.length.toLocaleString()}`);
    console.log(`    rows: ${rows.length}`);
    console.log(`    headerRowIndex: ${headerRowIndex}`);
    console.log(`    headers (${headerCells.length}): ${headerCells.join(" | ")}`);
    console.log(`    first row cell counts after header: ${rowCellShape.join(", ") || "(none)"}`);
    console.log(`    parsed cards from this table: ${parsed.length}`);
    if (parsed.length) {
      console.log(`    first parsed: ${formatCard(parsed[0])}`);
      console.log(`    last parsed: ${formatCard(parsed[parsed.length - 1])}`);
    }
  });

  console.log("\nParsed Cards");
  console.log(`  Total parsed by current importer logic: ${allParsed.length}`);
  allParsed.slice(0, limit).forEach((card, index) => {
    console.log(`  ${String(index + 1).padStart(2, "0")}. ${formatCard(card)}`);
  });

  const firstDeckCost = html.search(/Deck\s+Cost/i);
  if (firstDeckCost >= 0) {
    const snippet = html.slice(Math.max(0, firstDeckCost - 1200), firstDeckCost + 2800);
    console.log("\nRaw HTML Snippet Around First Deck Cost");
    console.log(indent(snippet.replace(/\n/g, "\\n").slice(0, 4000), "  "));
  }

  if (save) {
    const outDir = path.join(projectRoot, "debug");
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "fandom-list-api.json"), text, "utf8");
    await writeFile(path.join(outDir, "fandom-list.html"), html, "utf8");
    await writeFile(path.join(outDir, "fandom-parsed-stats.json"), JSON.stringify(allParsed, null, 2), "utf8");
    console.log("\nSaved debug files:");
    console.log("  debug/fandom-list-api.json");
    console.log("  debug/fandom-list.html");
    console.log("  debug/fandom-parsed-stats.json");
  }
} catch (error) {
  console.error(`Inspection failed: ${error.message}`);
  process.exitCode = 1;
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

async function fetchText(targetUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(targetUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "application/json,text/html,text/plain,*/*",
        "user-agent": "Mozilla/5.0 ReshefCardArchiveStatsInspector/1.0",
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}; ${text.slice(0, 160).replace(/\s+/g, " ")}`);
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseStatsHtml(html) {
  const tables = Array.from(html.matchAll(/<table\b[\s\S]*?<\/table>/gi), (match) => match[0]);
  const cards = [];
  for (const table of tables) {
    const text = stripTags(table);
    if (!/Deck\s+Cost/i.test(text) || !/\bATK\b/i.test(text) || !/\bDEF\b/i.test(text)) {
      continue;
    }
    cards.push(...parseStatsHtmlTable(table));
  }
  return cards.filter((card) => card.name);
}

function parseStatsHtmlTable(table) {
  const rows = Array.from(table.matchAll(/<tr\b[\s\S]*?<\/tr>/gi), (match) => match[0]);
  const headerRowIndex = rows.findIndex((row) => {
    const text = stripTags(row);
    return /Deck\s+Cost/i.test(text) && /\bATK\b/i.test(text) && /\bDEF\b/i.test(text);
  });
  if (headerRowIndex === -1) return [];

  const headers = extractCells(rows[headerRowIndex]).map((value) => value.toLowerCase());
  const index = headerIndex(headers);

  return rows.slice(headerRowIndex + 1).map((row) => {
    return statsCardFromCells(extractCells(row), index);
  }).filter(Boolean);
}

function headerIndex(headers) {
  return {
    number: findHeader(headers, ["#", "number", "card #"]),
    card: findHeader(headers, ["card", "name"]),
    rodName: findHeader(headers, ["rod name"]),
    cost: findHeader(headers, ["deck cost", "cost"]),
    attribute: findHeader(headers, ["alignment", "attribute", "element"]),
    type: findHeader(headers, ["type"]),
    level: findHeader(headers, ["level", "stars"]),
    atk: findHeader(headers, ["atk", "attack"]),
    def: findHeader(headers, ["def", "defense"]),
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

  return {
    number: parseNumber(value("number")),
    name,
    rodName: rodName && rodName !== name ? cleanName(rodName) : "",
    cost,
    duelistLevel: cost,
    attribute: normalizeAttribute(value("attribute")),
    type: normalizeType(value("type")),
    level: parseNumber(value("level")),
    atk: parseNumber(value("atk")),
    def: parseNumber(value("def")),
    status: value("status") || "Unknown",
  };
}

function extractCells(rowHtml) {
  return Array.from(rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi), (match) => stripTags(match[1]));
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

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^\d-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function countMatches(value, regex) {
  return (String(value).match(regex) || []).length;
}

function formatCard(card) {
  return `#${pad(card.number)} ${card.name} | cost=${card.cost ?? "-"} | atk=${card.atk ?? "-"} | def=${card.def ?? "-"} | level=${card.level ?? "-"} | attr=${card.attribute || "-"} | type=${card.type || "-"} | status=${card.status || "-"}`;
}

function pad(number) {
  return number ? String(number).padStart(3, "0") : "---";
}

function indent(value, prefix) {
  return String(value).split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function readArgs() {
  const parsed = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const [key, ...rest] = arg.slice(2).split("=");
    parsed[key] = rest.length ? rest.join("=") : true;
  }
  return parsed;
}
