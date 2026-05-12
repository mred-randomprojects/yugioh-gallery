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
const CARD_WIKI_PAGE_OVERRIDES = {
  584: 'Spirit_Message_"I"_(ROD)',
  585: 'Spirit_Message_"N"_(ROD)',
  586: 'Spirit_Message_"A"_(ROD)',
  587: 'Spirit_Message_"L"_(ROD)',
};
const FIELD_CARD_IMAGES = {
  Forest: "assets/cards/downloaded/Forest-ROD-EN-VG.webp",
  Wasteland: "assets/cards/downloaded/Wasteland-ROD-EN-VG.webp",
  Mountain: "assets/cards/downloaded/Mountain-ROD-EN-VG.webp",
  Sogen: "assets/cards/downloaded/Sogen-ROD-EN-VG.webp",
  Umi: "assets/cards/downloaded/Umi-ROD-EN-VG.webp",
  Yami: "assets/cards/downloaded/Yami-ROD-EN-VG.webp",
};
const MONSTER_TYPES = [
  "Aqua",
  "Beast",
  "Beast-Warrior",
  "Dinosaur",
  "Dragon",
  "Fairy",
  "Fiend",
  "Fish",
  "Insect",
  "Machine",
  "Plant",
  "Pyro",
  "Reptile",
  "Rock",
  "Sea Serpent",
  "Spellcaster",
  "Thunder",
  "Warrior",
  "Winged Beast",
  "Zombie",
];
const TYPE_ICON_META = {
  Aqua: { code: "AQ", color: "#46bad1" },
  Beast: { code: "BE", color: "#bc9b55" },
  "Beast-Warrior": { code: "BW", color: "#d08b4c" },
  Dinosaur: { code: "DI", color: "#8da75c" },
  Dragon: { code: "DR", color: "#c46862" },
  Fairy: { code: "FA", color: "#f3d783" },
  Fiend: { code: "FI", color: "#9a6fbd" },
  Fish: { code: "FS", color: "#4f92c9" },
  Insect: { code: "IN", color: "#6aa756" },
  Machine: { code: "MA", color: "#9aa0a6" },
  Plant: { code: "PL", color: "#5db86e" },
  Pyro: { code: "PY", color: "#df6542" },
  Reptile: { code: "RE", color: "#7aa665" },
  Rock: { code: "RO", color: "#a98d67" },
  "Sea Serpent": { code: "SS", color: "#3d8bbd" },
  Spellcaster: { code: "SC", color: "#7d7fe1" },
  Thunder: { code: "TH", color: "#f0c84d" },
  Warrior: { code: "WA", color: "#d0aa68" },
  "Winged Beast": { code: "WB", color: "#8db3cf" },
  Zombie: { code: "ZO", color: "#8f9890" },
};
const TERRAIN_CHEATSHEET = [
  {
    name: "Arena",
    slug: "arena",
    cardName: "",
    mapImage: "assets/fields/arena.png",
    boosted: [],
    debuffed: [],
  },
  {
    name: "Forest",
    slug: "forest",
    cardName: "Forest",
    mapImage: "assets/fields/forest.png",
    boosted: [{ type: "Plant" }, { type: "Beast-Warrior" }, { type: "Insect" }, { type: "Beast" }],
    debuffed: [],
  },
  {
    name: "Wasteland",
    slug: "wasteland",
    cardName: "Wasteland",
    mapImage: "assets/fields/wasteland.png",
    boosted: [{ type: "Zombie", alias: "Undead" }, { type: "Dinosaur" }, { type: "Rock" }],
    debuffed: [],
  },
  {
    name: "Mountain",
    slug: "mountain",
    cardName: "Mountain",
    mapImage: "assets/fields/mountain.png",
    boosted: [{ type: "Dragon" }, { type: "Winged Beast", alias: "Bird" }, { type: "Thunder", alias: "Lightning" }],
    debuffed: [],
  },
  {
    name: "Sogen",
    slug: "sogen",
    cardName: "Sogen",
    mapImage: "assets/fields/sogen.png",
    boosted: [{ type: "Beast-Warrior" }, { type: "Warrior" }],
    debuffed: [],
  },
  {
    name: "Umi",
    slug: "umi",
    cardName: "Umi",
    mapImage: "assets/fields/umi.png",
    boosted: [{ type: "Aqua", alias: "Water" }, { type: "Fish" }, { type: "Sea Serpent", alias: "Sea Dragon" }, { type: "Thunder", alias: "Lightning" }],
    debuffed: [{ type: "Machine" }, { type: "Pyro", alias: "Fire" }],
  },
  {
    name: "Yami",
    slug: "yami",
    cardName: "Yami",
    mapImage: "assets/fields/yami.png",
    boosted: [{ type: "Spellcaster", alias: "Magician" }, { type: "Fiend", alias: "Demon" }],
    debuffed: [{ type: "Fairy", alias: "Angel" }],
  },
];
let controlsResizeObserver = null;

const state = {
  cards: [],
  filtered: [],
  sortKey: "number",
  sortDirection: "asc",
  view: "grid",
  tool: "gallery",
};

const els = {
  galleryToolButton: document.querySelector("#galleryToolButton"),
  fieldTypesToolButton: document.querySelector("#fieldTypesToolButton"),
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
  shell: document.querySelector("#appShell"),
  controls: document.querySelector(".controls"),
  grid: document.querySelector("#cardGrid"),
  tableWrap: document.querySelector("#tableWrap"),
  table: document.querySelector("#cardTable"),
  template: document.querySelector("#cardTemplate"),
  detail: document.querySelector("#detailPanel"),
  closeDetail: document.querySelector("#closeDetail"),
  detailImage: document.querySelector("#detailImage"),
  detailNumber: document.querySelector("#detailNumber"),
  detailName: document.querySelector("#detailName"),
  detailWiki: document.querySelector("#detailWikiLink"),
  detailStats: document.querySelector("#detailStats"),
  fieldTypesTool: document.querySelector("#fieldTypesTool"),
  terrainGrid: document.querySelector("#terrainGrid"),
  typeLegend: document.querySelector("#typeLegend"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  syncSortState();
  updateSortDirectionButton();
  bindEvents();
  setupStickyOffset();
  renderFieldTypes();
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
  els.galleryToolButton.addEventListener("click", () => setTool("gallery"));
  els.fieldTypesToolButton.addEventListener("click", () => setTool("fieldTypes"));
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
    setDetailOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDetailOpen(false);
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
    renderFieldTypes();
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
  renderFieldTypes();
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
  renderFieldTypes();
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
    const wikiLink = tile.querySelector(".card-tile__effect-link");
    const img = tile.querySelector("img");
    const frame = tile.querySelector(".card-tile__image-frame");
    wikiLink.href = cardWikiUrl(card);
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
      <td><strong>${escapeHtml(card.name)}</strong><a class="table-effect-link wiki-link" href="${escapeHtml(cardWikiUrl(card))}" target="_blank" rel="noreferrer">Effects</a></td>
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
    row.querySelector(".wiki-link").addEventListener("click", (event) => {
      event.stopPropagation();
    });
    row.addEventListener("click", () => showDetail(card));
    fragment.append(row);
  });
  els.table.append(fragment);
}

function renderFieldTypes() {
  if (!els.terrainGrid || !els.typeLegend) return;

  const fragment = document.createDocumentFragment();
  TERRAIN_CHEATSHEET.forEach((terrain) => {
    const fieldCard = terrain.cardName ? cardByName(terrain.cardName) : null;
    const article = document.createElement("article");
    article.className = `terrain-card terrain-card--${terrain.slug}`;
    article.innerHTML = `
      <div class="terrain-card__map">
        ${terrainArtHtml(terrain)}
      </div>
      <div class="terrain-card__identity">
        <h3>${escapeHtml(terrain.name)}</h3>
        ${fieldCardHtml(terrain, fieldCard)}
      </div>
      <div class="terrain-card__effects">
        ${effectBlock("+30% ATK/DEF", terrain.boosted, "boost")}
        ${effectBlock("-30% ATK/DEF", terrain.debuffed, "debuff")}
      </div>
    `;
    fragment.append(article);
  });

  els.terrainGrid.replaceChildren(fragment);
  renderTypeLegend();
}

function terrainArtHtml(terrain) {
  if (terrain.mapImage) {
    return `
      <span class="terrain-art terrain-art--image" role="img" aria-label="${escapeHtml(terrain.name)} terrain">
        <img src="${escapeHtml(terrain.mapImage)}" alt="">
      </span>
    `;
  }

  return `
    <span class="terrain-art terrain-art--${escapeHtml(terrain.slug)}" role="img" aria-label="${escapeHtml(terrain.name)} terrain">
      <span class="terrain-art__grid" aria-hidden="true"></span>
    </span>
  `;
}

function fieldCardHtml(terrain, fieldCard) {
  if (!terrain.cardName) {
    return `
      <div class="terrain-card__field-card terrain-card__field-card--default">
        <span class="default-card-icon" aria-hidden="true"></span>
        <span>
          <b>Default arena</b>
          <small>No field card required</small>
        </span>
      </div>
    `;
  }

  const image = fieldCard?.image || FIELD_CARD_IMAGES[terrain.cardName] || "";
  const cardNumber = fieldCard?.numberText ? `#${fieldCard.numberText} ` : "";
  const url = fieldCard ? cardWikiUrl(fieldCard) : cardWikiUrl({ name: terrain.cardName, number: 0 });

  return `
    <a class="terrain-card__field-card" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(terrain.cardName)} card">
      <span>
        <b>${escapeHtml(terrain.cardName)}</b>
        <small>${escapeHtml(cardNumber)}Field card</small>
      </span>
    </a>
  `;
}

function effectBlock(label, items, tone) {
  const content = items.length
    ? `<div class="type-chip-list">${items.map((item) => typeChip(item, tone)).join("")}</div>`
    : `<p class="effect-none">None</p>`;

  return `
    <section class="terrain-effect terrain-effect--${escapeHtml(tone)}">
      <span class="terrain-effect__label">${escapeHtml(label)}</span>
      ${content}
    </section>
  `;
}

function renderTypeLegend() {
  const discoveredTypes = uniqueSorted(
    state.cards
      .filter(isMonster)
      .map((card) => card.type)
      .filter((type) => MONSTER_TYPES.includes(type)),
  );
  const types = discoveredTypes.length ? discoveredTypes : MONSTER_TYPES;
  els.typeLegend.innerHTML = types.map((type) => typeChip({ type }, "legend")).join("");
}

function typeChip(item, tone = "legend") {
  const meta = TYPE_ICON_META[item.type] || {
    code: item.type.slice(0, 2).toUpperCase(),
    color: "#afa58d",
  };
  const image = `assets/types/${assetSlug(item.type)}.png`;
  const alias = item.alias ? `<small>${escapeHtml(item.alias)}</small>` : "";
  return `
    <span class="type-chip type-chip--${escapeHtml(tone)}" style="--type-color: ${escapeHtml(meta.color)}" title="${escapeHtml(item.alias ? `${item.type} / ${item.alias}` : item.type)}">
      <span class="type-chip__icon" aria-hidden="true">
        <img src="${escapeHtml(image)}" alt="" loading="lazy">
      </span>
      <span class="type-chip__text">
        <span>${escapeHtml(item.type)}</span>
        ${alias}
      </span>
    </span>
  `;
}

function cardByName(name) {
  const key = nameKey(name);
  return state.cards.find((card) => nameKey(card.name) === key || nameKey(card.rodName) === key) || null;
}

function assetSlug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  els.detailWiki.href = cardWikiUrl(card);
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
  setDetailOpen(true);
}

function setView(view) {
  state.view = view;
  els.grid.hidden = view !== "grid";
  els.tableWrap.hidden = view !== "table";
  els.gridButton.classList.toggle("is-active", view === "grid");
  els.tableButton.classList.toggle("is-active", view === "table");
  render();
}

function setTool(tool) {
  state.tool = tool;
  const isFieldTypes = tool === "fieldTypes";
  if (isFieldTypes) {
    setDetailOpen(false);
    renderFieldTypes();
  }

  els.shell.classList.toggle("is-field-types", isFieldTypes);
  els.fieldTypesTool.hidden = !isFieldTypes;
  els.galleryToolButton.classList.toggle("is-active", !isFieldTypes);
  els.fieldTypesToolButton.classList.toggle("is-active", isFieldTypes);
  els.galleryToolButton.setAttribute("aria-pressed", String(!isFieldTypes));
  els.fieldTypesToolButton.setAttribute("aria-pressed", String(isFieldTypes));
  if (!isFieldTypes) {
    updateStickyOffset();
  }
}

function setDetailOpen(isOpen) {
  els.detail.hidden = !isOpen;
  els.shell.classList.toggle("has-detail", isOpen);
}

function setupStickyOffset() {
  updateStickyOffset();
  window.addEventListener("resize", updateStickyOffset);
  if ("ResizeObserver" in window) {
    controlsResizeObserver = new ResizeObserver(updateStickyOffset);
    controlsResizeObserver.observe(els.controls);
  }
}

function updateStickyOffset() {
  const controlsHeight = els.controls.getBoundingClientRect().height;
  els.shell.style.setProperty("--detail-sticky-top", `${Math.ceil(controlsHeight + 16)}px`);
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

function cardWikiUrl(card) {
  const overridePageName = CARD_WIKI_PAGE_OVERRIDES[card.number];
  const pageName = overridePageName || `${wikiPageTitle(card.name)}_(ROD)`;
  return `https://yugipedia.com/wiki/${encodeWikiPageName(pageName)}`;
}

function wikiPageTitle(name) {
  return normalizeText(name)
    .replace(/#/g, "")
    .replace(/\s+/g, "_");
}

function encodeWikiPageName(pageName) {
  return encodeURIComponent(pageName)
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2C/g, ",")
    .replace(/'/g, "%27");
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
