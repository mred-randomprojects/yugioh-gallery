const SOURCES = {
  api: "https://yugipedia.com/api.php",
  galleryPage: "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards_(European_English)",
  listPage: "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards",
};

const CACHE_KEY = "reshef-card-archive:v1";
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const ATTRIBUTE_NAMES = {
  Black: "Dark",
  Dark: "Dark",
  Ground: "Earth",
  Earth: "Earth",
  White: "Light",
  Light: "Light",
};
const NUMERIC_SORT_KEYS = new Set(["atk", "def", "cost", "duelistLevel", "level", "number"]);

const state = {
  cards: [],
  filtered: [],
  sortKey: "number",
  sortDirection: "asc",
  view: "grid",
};

const els = {
  search: document.querySelector("#searchInput"),
  sort: document.querySelector("#sortSelect"),
  direction: document.querySelector("#directionButton"),
  maxCost: document.querySelector("#maxCostInput"),
  sacrifices: Array.from(document.querySelectorAll("[name='sacrificeFilter']")),
  kind: document.querySelector("#kindSelect"),
  type: document.querySelector("#typeSelect"),
  attribute: document.querySelector("#attributeSelect"),
  refresh: document.querySelector("#refreshButton"),
  gridButton: document.querySelector("#gridButton"),
  tableButton: document.querySelector("#tableButton"),
  loadedCount: document.querySelector("#loadedCount"),
  visibleCount: document.querySelector("#visibleCount"),
  monsterCount: document.querySelector("#monsterCount"),
  cacheStatus: document.querySelector("#cacheStatus"),
  message: document.querySelector("#message"),
  grid: document.querySelector("#cardGrid"),
  tableWrap: document.querySelector("#tableWrap"),
  table: document.querySelector("#cardTable"),
  template: document.querySelector("#cardTemplate"),
  detail: document.querySelector("#detailPanel"),
  closeDetail: document.querySelector("#closeDetail"),
  detailImage: document.querySelector("#detailImage"),
  detailNumber: document.querySelector("#detailNumber"),
  detailName: document.querySelector("#detailName"),
  detailStats: document.querySelector("#detailStats"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  syncSortState();
  updateSortDirectionButton();
  bindEvents();
  if (location.protocol === "file:") {
    els.refresh.textContent = "Import Needed";
    els.refresh.title = "Run node scripts/import-data.mjs, then reload this file.";
  }
  if (loadEmbeddedData()) return;
  if (hydrateFromCache()) return;
  updateCounts();
  els.cacheStatus.textContent = "Needs import";
  showMessage("No local card data yet. Run node scripts/test-sources.mjs, then node scripts/import-data.mjs after you find a working source.", "neutral");
}

function bindEvents() {
  els.search.addEventListener("input", render);
  els.sort.addEventListener("change", () => {
    syncSortState();
    render();
  });
  els.direction.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    updateSortDirectionButton();
    render();
  });
  els.kind.addEventListener("change", render);
  els.type.addEventListener("change", render);
  els.attribute.addEventListener("change", render);
  els.maxCost.addEventListener("input", render);
  els.sacrifices.forEach((input) => input.addEventListener("change", render));
  els.refresh.addEventListener("click", () => {
    if (location.protocol === "file:") {
      showMessage("Live refresh is blocked from file:// in this browser. Run node scripts/import-data.mjs, then reload this file.", "neutral");
      return;
    }
    loadSourceData({ force: true }).catch((error) => {
      showMessage(`Could not refresh source data. ${error.message}`);
      if (!state.cards.length) {
        els.cacheStatus.textContent = "Unavailable";
      }
    });
  });
  els.gridButton.addEventListener("click", () => setView("grid"));
  els.tableButton.addEventListener("click", () => setView("table"));
  els.closeDetail.addEventListener("click", () => {
    els.detail.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      els.detail.hidden = true;
    }
  });
}

function hydrateFromCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.cards) || !cached.cards.length) return false;
    state.cards = cached.cards.map(normalizeCard);
    els.cacheStatus.textContent = "Warm";
    populateFilters();
    render();
    return true;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return false;
  }
}

function loadEmbeddedData() {
  const data = window.RESHEF_CARD_DATA;
  if (!data || !Array.isArray(data.cards) || !data.cards.length) return false;
  state.cards = data.cards.map(normalizeCard);
  els.cacheStatus.textContent = "Local";
  showMessage("");
  populateFilters();
  render();
  return true;
}

async function loadSourceData(options = {}) {
  const cached = readCache();
  if (!options.force && cached) {
    state.cards = cached.cards;
    els.cacheStatus.textContent = "Warm";
    populateFilters();
    render();
    return;
  }

  showMessage("Loading source pages from Yugipedia...", "neutral");
  els.cacheStatus.textContent = "Loading";

  const [galleryHtml, listHtml] = await Promise.all([
    parsePage(SOURCES.galleryPage),
    parsePage(SOURCES.listPage),
  ]);

  const galleryCards = parseGallery(galleryHtml);
  const statCards = parseStatsTable(listHtml);
  const cards = mergeCards(galleryCards, statCards);
  const statCoverage = cards.filter((card) => {
    return Number.isFinite(card.cost) || Number.isFinite(card.atk) || Number.isFinite(card.def);
  }).length;

  if (cards.length < 700) {
    throw new Error(`Only ${cards.length} cards were parsed.`);
  }

  state.cards = cards;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ createdAt: Date.now(), cards }));
  els.cacheStatus.textContent = options.force ? "Refreshed" : "Ready";
  if (statCoverage < 700) {
    showMessage(`Loaded ${cards.length} gallery cards, but only ${statCoverage} cards had parsed stat fields.`, "error");
  } else {
    showMessage("");
  }
  populateFilters();
  render();
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.cards)) return null;
    if (Date.now() - Number(cached.createdAt || 0) > CACHE_MAX_AGE) return null;
    return cached;
  } catch {
    return null;
  }
}

function parsePage(page) {
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    prop: "text",
    page,
    disableeditsection: "1",
    disablelimitreport: "1",
  });
  return requestApi(params).then((data) => {
    const html = data?.parse?.text?.["*"];
    if (!html) {
      const message = data?.error?.info || `No parse HTML returned for ${page}`;
      throw new Error(message);
    }
    return html;
  });
}

async function requestApi(params) {
  const query = params.toString();
  const corsUrl = `${SOURCES.api}?${query}&origin=*`;
  try {
    const response = await fetch(corsUrl, { cache: "no-store" });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Local file origins often need the JSONP path below.
  }
  return jsonp(`${SOURCES.api}?${query}`);
}

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `reshefJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Yugipedia request timed out."));
    }, 20000);

    function cleanup() {
      window.clearTimeout(timer);
      delete window[callback];
      script.remove();
    }

    window[callback] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Yugipedia request failed."));
    };

    script.src = `${url}&callback=${callback}`;
    document.head.append(script);
  });
}

function parseGallery(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const boxes = Array.from(doc.querySelectorAll(".gallerybox"));
  const items = boxes.length ? boxes : Array.from(doc.querySelectorAll("li, figure"));

  return items
    .map((item) => {
      const text = normalizeText(item.textContent);
      const number = parseNumber(text.match(/#\s*(\d{1,3})/)?.[1]);
      if (!number) return null;

      const link = Array.from(item.querySelectorAll("a")).find((anchor) => {
        const value = normalizeText(anchor.textContent);
        return value && !value.startsWith("#") && !/file:/i.test(anchor.getAttribute("href") || "");
      });
      const quotedName = text.match(/"([^"]+)"/)?.[1];
      const name = normalizeText(link?.textContent || quotedName || "");
      const image = normalizeImageUrl(item.querySelector("img")?.getAttribute("src") || "");

      return {
        number,
        numberText: padNumber(number),
        name,
        image,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
}

function parseStatsTable(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  const table = tables.find((candidate) => {
    const header = normalizeText(candidate.querySelector("tr")?.textContent || "");
    return /\b(?:Deck Cost|DC)\b/i.test(header) && /\bATK\b/i.test(header) && /\bDEF\b/i.test(header);
  });

  if (!table) {
    throw new Error("The Yugipedia stats table was not found.");
  }

  const headerCells = Array.from(table.querySelectorAll("tr:first-child th, tr:first-child td"));
  const headers = headerCells.map((cell) => normalizeText(cell.textContent).toLowerCase());
  const index = {
    number: findHeader(headers, ["#", "number", "card #"]),
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

  return Array.from(table.querySelectorAll("tr"))
    .slice(1)
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      if (cells.length < 2) return null;
      const value = (key) => normalizeText(cells[index[key]]?.textContent || "");
      const rawName = value("card");
      const rodName = value("rodName");
      const name = normalizeText(rawName || rodName);
      if (!name) return null;
      const cost = parseNumber(value("cost"));
      const level = parseNumber(value("level"));
      const atk = parseNumber(value("atk"));
      const def = parseNumber(value("def"));

      return {
        number: parseNumber(value("number")),
        name,
        rodName: rodName && rodName !== name ? rodName : "",
        cost,
        duelistLevel: cost,
        attribute: normalizeAttribute(value("attribute")),
        type: normalizeType(value("type") || value("cardType")),
        level,
        atk,
        def,
        password: value("password"),
        status: value("status") || "Unlimited",
      };
    })
    .filter(Boolean);
}

function findHeader(headers, names) {
  const wanted = names.map((name) => name.toLowerCase());
  const exact = headers.findIndex((header) => wanted.includes(header));
  if (exact !== -1) return exact;
  return headers.findIndex((header) => wanted.some((name) => header.includes(name)));
}

function mergeCards(galleryCards, statCards) {
  const statsByNumber = new Map();
  const statsByName = new Map();

  statCards.forEach((card) => {
    if (card.number) statsByNumber.set(card.number, card);
    statsByName.set(nameKey(card.name), card);
    if (card.rodName) statsByName.set(nameKey(card.rodName), card);
  });

  return galleryCards.map((galleryCard) => {
    const stats = statsByNumber.get(galleryCard.number) || statsByName.get(nameKey(galleryCard.name)) || {};
    const merged = {
      ...galleryCard,
      ...stats,
      number: galleryCard.number,
      numberText: galleryCard.numberText,
      name: galleryCard.name || stats.name || `Card #${galleryCard.numberText}`,
      image: galleryCard.image || stats.image || "",
    };
    merged.kind = isMonster(merged) ? "monster" : "spelltrap";
    return merged;
  });
}

function populateFilters() {
  const types = uniqueSorted(state.cards.map((card) => card.type).filter(Boolean));
  const attributes = uniqueSorted(state.cards.map((card) => card.attribute).filter(Boolean));
  fillSelect(els.type, types, "All types");
  fillSelect(els.attribute, attributes, "All alignments");
}

function fillSelect(select, values, label) {
  const previous = select.value;
  select.innerHTML = "";
  select.append(new Option(label, "all"));
  values.forEach((value) => select.append(new Option(value, value)));
  select.value = values.includes(previous) ? previous : "all";
}

function render() {
  syncSortState();
  const query = els.search.value.trim().toLowerCase();
  const maxCost = parseNumber(els.maxCost.value);
  const selectedSacrifices = selectedSacrificeValues();
  const kind = els.kind.value;
  const type = els.type.value;
  const attribute = els.attribute.value;

  state.filtered = state.cards
    .filter((card) => {
      if (kind !== "all" && card.kind !== kind) return false;
      if (type !== "all" && card.type !== type) return false;
      if (attribute !== "all" && card.attribute !== attribute) return false;
      if (Number.isFinite(maxCost) && (!Number.isFinite(card.cost) || card.cost > maxCost)) return false;
      if (selectedSacrifices.size && !selectedSacrifices.has(sacrificeCountForLevel(card.level))) return false;
      if (!query) return true;
      return [
        card.numberText,
        card.name,
        card.rodName,
        card.password,
        card.type,
        card.attribute,
        card.level,
        formatSacrificeCount(card.level),
        card.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort(compareCards);

  updateCounts();
  if (state.view === "grid") {
    renderGrid();
  } else {
    renderTable();
  }
}

function compareCards(a, b) {
  const direction = state.sortDirection === "asc" ? 1 : -1;
  const key = state.sortKey;
  const aValue = comparableValue(a, key);
  const bValue = comparableValue(b, key);

  if (NUMERIC_SORT_KEYS.has(key)) {
    const aHasValue = Number.isFinite(aValue);
    const bHasValue = Number.isFinite(bValue);
    if (aHasValue && bHasValue && aValue !== bValue) return (aValue - bValue) * direction;
    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
  } else {
    const result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
    if (result) return result * direction;
  }

  return (a.number - b.number) * direction;
}

function comparableValue(card, key) {
  const value = card[key];
  if (NUMERIC_SORT_KEYS.has(key)) {
    return value;
  }
  return value || "";
}

function syncSortState() {
  state.sortKey = els.sort.value;
}

function updateSortDirectionButton() {
  els.direction.firstElementChild.innerHTML = state.sortDirection === "asc" ? "&#8593;" : "&#8595;";
}

function selectedSacrificeValues() {
  return new Set(
    els.sacrifices
      .filter((input) => input.checked)
      .map((input) => Number(input.value)),
  );
}

function renderGrid() {
  els.grid.replaceChildren();
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((card) => {
    const tile = els.template.content.firstElementChild.cloneNode(true);
    const button = tile.querySelector("button");
    const img = tile.querySelector("img");
    const frame = tile.querySelector(".card-tile__image-frame");
    tile.querySelector(".card-tile__number").textContent = `#${card.numberText}`;
    tile.querySelector(".card-tile__sacrifices").textContent = formatSacrificeBadge(card.level);
    tile.querySelector(".card-tile__name").textContent = card.name;
    tile.querySelector(".card-tile__stats").innerHTML = [
      statPill("ATK", formatValue(card.atk)),
      statPill("DEF", formatValue(card.def)),
      statPill("Cost", formatValue(card.cost)),
      statPill("Password", formatPassword(card.password)),
    ].join("");
    if (card.image) {
      img.src = card.image;
      img.alt = card.name;
    } else {
      img.hidden = true;
      frame.dataset.missing = "Image unavailable";
    }
    img.onerror = () => {
      img.removeAttribute("src");
      img.hidden = true;
      img.alt = `${card.name} image unavailable`;
      frame.dataset.missing = "Image unavailable";
    };
    button.addEventListener("click", () => showDetail(card));
    fragment.append(tile);
  });
  els.grid.append(fragment);
}

function renderTable() {
  els.table.replaceChildren();
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((card) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>#${card.numberText}</td>
      <td><strong>${escapeHtml(card.name)}</strong></td>
      <td>${formatValue(card.cost)}</td>
      <td>${formatValue(card.duelistLevel)}</td>
      <td>${formatValue(card.atk)}</td>
      <td>${formatValue(card.def)}</td>
      <td>${formatValue(card.level)}</td>
      <td>${escapeHtml(card.attribute || "-")}</td>
      <td>${escapeHtml(card.type || "-")}</td>
      <td>${escapeHtml(formatPassword(card.password))}</td>
      <td>${escapeHtml(card.status || "-")}</td>
    `;
    row.addEventListener("click", () => showDetail(card));
    fragment.append(row);
  });
  els.table.append(fragment);
}

function showDetail(card) {
  if (card.image) {
    els.detailImage.src = card.image;
    els.detailImage.hidden = false;
  } else {
    els.detailImage.removeAttribute("src");
    els.detailImage.hidden = true;
  }
  els.detailImage.alt = card.name;
  els.detailNumber.textContent = `#${card.numberText}`;
  els.detailName.textContent = card.name;
  els.detailStats.innerHTML = [
    ["Deck Cost", formatValue(card.cost)],
    ["Required Duelist Level", formatValue(card.duelistLevel)],
    ["ATK", formatValue(card.atk)],
    ["DEF", formatValue(card.def)],
    ["Card Level", formatValue(card.level)],
    ["Sacrifices", formatSacrificeCount(card.level)],
    ["Alignment", card.attribute || "-"],
    ["Type", card.type || "-"],
    ["Password", formatPassword(card.password)],
    ["Status", card.status || "-"],
    ["ROD Name", card.rodName || card.name],
  ]
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
  els.detail.hidden = false;
}

function setView(view) {
  state.view = view;
  els.grid.hidden = view !== "grid";
  els.tableWrap.hidden = view !== "table";
  els.gridButton.classList.toggle("is-active", view === "grid");
  els.tableButton.classList.toggle("is-active", view === "table");
  render();
}

function normalizeCard(card) {
  const number = parseNumber(card.number);
  const cost = parseNumber(card.cost);
  const atk = parseNumber(card.atk);
  const def = parseNumber(card.def);
  const level = parseNumber(card.level);
  const normalized = {
    ...card,
    number,
    numberText: card.numberText || padNumber(number || 0),
    name: normalizeText(card.name),
    rodName: normalizeText(card.rodName),
    image: normalizeImageUrl(card.image),
    cost,
    duelistLevel: parseNumber(card.duelistLevel) ?? cost,
    attribute: normalizeAttribute(card.attribute),
    type: normalizeType(card.type),
    level,
    atk,
    def,
    password: normalizeText(card.password),
    status: normalizeText(card.status || "Unknown"),
  };
  normalized.kind = isMonster(normalized) ? "monster" : "spelltrap";
  return normalized;
}

function updateCounts() {
  els.loadedCount.textContent = state.cards.length.toLocaleString();
  els.visibleCount.textContent = state.filtered.length.toLocaleString();
  els.monsterCount.textContent = state.cards.filter(isMonster).length.toLocaleString();
}

function statPill(label, value) {
  return `<span class="stat-pill">${escapeHtml(label)}<b>${escapeHtml(value)}</b></span>`;
}

function formatPassword(value) {
  return normalizeText(value) || "No password";
}

function showMessage(text, tone = "error") {
  els.message.hidden = !text;
  els.message.textContent = text || "";
  els.message.dataset.tone = tone;
}

function isMonster(card) {
  return Number.isFinite(card.atk) || Number.isFinite(card.def) || Number.isFinite(card.level);
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

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAttribute(value) {
  const normalized = normalizeText(value);
  return ATTRIBUTE_NAMES[normalized] || normalized;
}

function normalizeType(value) {
  return normalizeText(value)
    .replace(/^Dargon$/i, "Dragon")
    .replace(/^Beasat Warrior$/i, "Beast-Warrior")
    .replace(/^Beast Warrior$/i, "Beast-Warrior")
    .replace(/^Winged Beast$/i, "Winged Beast")
    .replace(/^Wined Bast$/i, "Winged Beast")
    .replace(/^Soldier$/i, "Warrior");
}

function normalizeImageUrl(value) {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://yugipedia.com${value}`;
  return value;
}

function nameKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "-";
}

function formatSacrificeBadge(level) {
  const sacrifices = sacrificeCountForLevel(level);
  return sacrifices === null ? "Sacrifices -" : `Sacrifices ${sacrifices}`;
}

function formatSacrificeCount(level) {
  const sacrifices = sacrificeCountForLevel(level);
  return sacrifices === null ? "-" : String(sacrifices);
}

function sacrificeCountForLevel(level) {
  if (!Number.isFinite(level)) return null;
  if (level <= 4) return 0;
  if (level <= 6) return 1;
  if (level <= 8) return 2;
  return 3;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
