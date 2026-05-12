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
const DEFAULT_TOOL = "gallery";
const DEFAULT_VIEW = "grid";
const DEFAULT_SORT_KEY = "number";
const DEFAULT_SORT_DIRECTION = "asc";
const ROUTE_BY_TOOL = {
  gallery: "gallery",
  fieldTypes: "field-types",
};
const TOOL_BY_ROUTE = {
  gallery: "gallery",
  "field-types": "fieldTypes",
  fieldtypes: "fieldTypes",
  fields: "fieldTypes",
};
const ROUTE_BASE_PATH = getRouteBasePath();
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
let isApplyingUrlState = false;

const state = {
  cards: [],
  filtered: [],
  sortKey: DEFAULT_SORT_KEY,
  sortDirection: DEFAULT_SORT_DIRECTION,
  view: DEFAULT_VIEW,
  tool: DEFAULT_TOOL,
  selectedCardNumber: null,
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
  gridButton: document.querySelector("#gridButton"),
  tableButton: document.querySelector("#tableButton"),
  loadedCount: document.querySelector("#loadedCount"),
  visibleCount: document.querySelector("#visibleCount"),
  monsterCount: document.querySelector("#monsterCount"),
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
  const initialUrl = navigationUrlFromLocation();
  syncSortState();
  updateSortDirectionButton();
  bindEvents();
  setupStickyOffset();
  renderFieldTypes();
  if (loadEmbeddedData(initialUrl)) return;
  updateCounts();
  showMessage("Card data is unavailable.", "neutral");
}

function bindEvents() {
  els.galleryToolButton.addEventListener("click", () => setTool("gallery", { history: "push" }));
  els.fieldTypesToolButton.addEventListener("click", () => setTool("fieldTypes", { history: "push" }));
  els.search.addEventListener("input", handleGalleryStateChange);
  els.sort.addEventListener("change", () => {
    syncSortState();
    handleGalleryStateChange();
  });
  els.direction.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    updateSortDirectionButton();
    handleGalleryStateChange();
  });
  els.kind.addEventListener("change", handleGalleryStateChange);
  els.type.addEventListener("change", handleGalleryStateChange);
  els.attribute.addEventListener("change", handleGalleryStateChange);
  els.maxCost.addEventListener("input", handleGalleryStateChange);
  els.sacrifices.forEach((input) => input.addEventListener("change", handleGalleryStateChange));
  els.gridButton.addEventListener("click", () => setView("grid", { history: "replace" }));
  els.tableButton.addEventListener("click", () => setView("table", { history: "replace" }));
  els.closeDetail.addEventListener("click", () => {
    setDetailOpen(false, { history: "push" });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDetailOpen(false, { history: "push" });
    }
  });
  window.addEventListener("popstate", () => {
    applyUrlState(navigationUrlFromLocation());
    render({ revealSelectedCard: true });
  });
}

function handleGalleryStateChange() {
  render();
  syncUrlFromState({ history: "replace" });
}

function loadEmbeddedData(initialUrl) {
  const data = window.RESHEF_CARD_DATA;
  if (!data || !Array.isArray(data.cards) || !data.cards.length) return false;
  state.cards = data.cards.map(normalizeCard);
  showMessage("");
  populateFilters();
  applyUrlState(initialUrl, { replace: true });
  renderFieldTypes();
  render({ revealSelectedCard: true });
  return true;
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

function render(options = {}) {
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
  syncSelectedDetailAfterRender(options);
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
    tile.dataset.cardNumber = String(card.number);
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
    button.addEventListener("click", () => showDetail(card, { history: "push" }));
    fragment.append(tile);
  });
  els.grid.append(fragment);
}

function renderTable() {
  els.table.replaceChildren();
  const fragment = document.createDocumentFragment();
  state.filtered.forEach((card) => {
    const row = document.createElement("tr");
    row.dataset.cardNumber = String(card.number);
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
    row.addEventListener("click", () => showDetail(card, { history: "push" }));
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

function showDetail(card, options = {}) {
  state.selectedCardNumber = card.number;
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
  setDetailOpen(true, { updateUrl: false });
  updateSelectedCardMarkers();
  if (options.reveal) {
    scrollToCard(card.number);
  }
  syncUrlFromState({ history: options.history || "push", updateUrl: options.updateUrl });
}

function setView(view, options = {}) {
  view = view === "table" ? "table" : DEFAULT_VIEW;
  state.view = view;
  els.grid.hidden = view !== "grid";
  els.tableWrap.hidden = view !== "table";
  els.gridButton.classList.toggle("is-active", view === "grid");
  els.tableButton.classList.toggle("is-active", view === "table");
  if (options.render !== false) {
    render();
  }
  syncUrlFromState({ history: options.history || "replace", updateUrl: options.updateUrl });
}

function setTool(tool, options = {}) {
  tool = tool === "fieldTypes" ? "fieldTypes" : DEFAULT_TOOL;
  state.tool = tool;
  const isFieldTypes = tool === "fieldTypes";
  if (isFieldTypes) {
    setDetailOpen(false, { updateUrl: false });
    renderFieldTypes();
  }

  els.shell.classList.toggle("is-field-types", isFieldTypes);
  els.fieldTypesTool.hidden = !isFieldTypes;
  els.galleryToolButton.classList.toggle("is-active", !isFieldTypes);
  els.fieldTypesToolButton.classList.toggle("is-active", isFieldTypes);
  els.galleryToolButton.setAttribute("aria-pressed", String(!isFieldTypes));
  els.fieldTypesToolButton.setAttribute("aria-pressed", String(isFieldTypes));
  setAriaCurrent(els.galleryToolButton, !isFieldTypes);
  setAriaCurrent(els.fieldTypesToolButton, isFieldTypes);
  if (!isFieldTypes) {
    updateStickyOffset();
  }
  syncUrlFromState({ history: options.history || "replace", updateUrl: options.updateUrl });
}

function setAriaCurrent(element, isCurrent) {
  if (isCurrent) {
    element.setAttribute("aria-current", "page");
  } else {
    element.removeAttribute("aria-current");
  }
}

function setDetailOpen(isOpen, options = {}) {
  if (!isOpen) {
    state.selectedCardNumber = null;
  }
  els.detail.hidden = !isOpen;
  els.shell.classList.toggle("has-detail", isOpen);
  updateSelectedCardMarkers();
  syncUrlFromState({ history: options.history || "replace", updateUrl: options.updateUrl });
}

function applyUrlState(url, options = {}) {
  isApplyingUrlState = true;
  try {
    const tool = toolFromPath(url.pathname);
    setTool(tool, { updateUrl: false });
    applyGalleryParams(url.searchParams);
    setView(viewFromParam(url.searchParams.get("view")), { render: false, updateUrl: false });
    state.selectedCardNumber = tool === "gallery" ? cardNumberFromUrlParam(url.searchParams.get("card")) : null;
    updateSortDirectionButton();
  } finally {
    isApplyingUrlState = false;
  }

  if (options.replace) {
    syncUrlFromState({ history: "replace" });
  }
}

function applyGalleryParams(params) {
  els.search.value = params.get("q") || "";
  setSelectValue(els.sort, params.get("sort"), DEFAULT_SORT_KEY);
  state.sortDirection = params.get("dir") === "desc" ? "desc" : DEFAULT_SORT_DIRECTION;

  const maxCost = parseNumber(params.get("maxCost"));
  els.maxCost.value = Number.isFinite(maxCost) && maxCost >= 0 ? String(maxCost) : "";

  const sacrifices = new Set(
    (params.get("sacrifices") || "")
      .split(",")
      .map((value) => parseNumber(value))
      .filter((value) => [0, 1, 2, 3].includes(value)),
  );
  els.sacrifices.forEach((input) => {
    input.checked = sacrifices.has(Number(input.value));
  });

  setSelectValue(els.kind, params.get("kind"), "all");
  setSelectValue(els.type, params.get("type"), "all");
  setSelectValue(els.attribute, params.get("attribute"), "all");
  syncSortState();
}

function setSelectValue(select, value, fallback) {
  const values = Array.from(select.options).map((option) => option.value);
  select.value = value && values.includes(value) ? value : fallback;
}

function viewFromParam(value) {
  return value === "table" ? "table" : DEFAULT_VIEW;
}

function syncSelectedDetailAfterRender(options = {}) {
  if (state.tool !== "gallery" || state.selectedCardNumber === null) {
    updateSelectedCardMarkers();
    return;
  }

  const selectedCard = cardByNumber(state.selectedCardNumber);
  const selectedIsVisible = state.filtered.some((card) => card.number === state.selectedCardNumber);
  if (!selectedCard || !selectedIsVisible) {
    setDetailOpen(false, { updateUrl: false });
    return;
  }

  showDetail(selectedCard, {
    reveal: Boolean(options.revealSelectedCard),
    updateUrl: false,
  });
}

function updateSelectedCardMarkers() {
  document.querySelectorAll("[data-card-number]").forEach((element) => {
    element.classList.toggle("is-selected", Number(element.dataset.cardNumber) === state.selectedCardNumber);
  });
}

function scrollToCard(cardNumber) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(`[data-card-number="${cardNumber}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  });
}

function syncUrlFromState(options = {}) {
  if (isApplyingUrlState || options.updateUrl === false) return;

  const nextUrl = currentStateUrl();
  const currentUrl = `${location.pathname}${location.search}`;
  if (nextUrl === currentUrl) return;

  const method = options.history === "push" ? "pushState" : "replaceState";
  try {
    history[method]({ tool: state.tool }, "", nextUrl);
  } catch {
    // Some local file:// contexts reject path changes. The UI still keeps working.
  }
}

function currentStateUrl() {
  const route = ROUTE_BY_TOOL[state.tool] || ROUTE_BY_TOOL[DEFAULT_TOOL];
  const path = joinRoutePath(ROUTE_BASE_PATH, route);
  if (state.tool !== "gallery") {
    return path;
  }

  const params = gallerySearchParams();
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function gallerySearchParams() {
  syncSortState();
  const params = new URLSearchParams();
  const query = els.search.value.trim();
  const maxCost = parseNumber(els.maxCost.value);
  const sacrifices = Array.from(selectedSacrificeValues()).sort((a, b) => a - b);

  if (query) params.set("q", query);
  if (state.sortKey !== DEFAULT_SORT_KEY) params.set("sort", state.sortKey);
  if (state.sortDirection !== DEFAULT_SORT_DIRECTION) params.set("dir", state.sortDirection);
  if (Number.isFinite(maxCost) && maxCost >= 0) params.set("maxCost", String(maxCost));
  if (sacrifices.length) params.set("sacrifices", sacrifices.join(","));
  if (els.kind.value !== "all") params.set("kind", els.kind.value);
  if (els.type.value !== "all") params.set("type", els.type.value);
  if (els.attribute.value !== "all") params.set("attribute", els.attribute.value);
  if (state.view !== DEFAULT_VIEW) params.set("view", state.view);
  if (state.selectedCardNumber !== null) params.set("card", padNumber(state.selectedCardNumber));

  return params;
}

function navigationUrlFromLocation() {
  const url = new URL(location.href);
  const redirect = url.searchParams.get("redirect");
  if (!redirect) return url;
  return new URL(redirect, "https://reshef.local");
}

function getRouteBasePath() {
  const pathname = location.pathname.replace(/\/index\.html$/i, "/");
  const segments = pathname.split("/").filter(Boolean);
  const routeIndex = segments.findIndex((segment) => routeSegmentToTool(segment));
  if (routeIndex >= 0) {
    const baseSegments = segments.slice(0, routeIndex);
    return `/${baseSegments.join("/")}${baseSegments.length ? "/" : ""}`;
  }
  if (pathname.endsWith("/")) return pathname;
  const lastSegment = segments[segments.length - 1] || "";
  if (lastSegment && !lastSegment.includes(".")) return `${pathname}/`;
  const lastSlash = pathname.lastIndexOf("/");
  return pathname.slice(0, lastSlash + 1) || "/";
}

function joinRoutePath(basePath, route) {
  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${normalizedBase}${route}`;
}

function toolFromPath(pathname) {
  const segment = pathname.split("/").filter(Boolean).find((part) => routeSegmentToTool(part));
  return routeSegmentToTool(segment) || DEFAULT_TOOL;
}

function routeSegmentToTool(segment) {
  if (!segment) return null;
  return TOOL_BY_ROUTE[normalizeRouteSegment(segment)] || null;
}

function normalizeRouteSegment(segment) {
  return normalizeText(segment).toLowerCase().replace(/_/g, "-");
}

function cardNumberFromUrlParam(value) {
  const normalized = normalizeText(value).replace(/^#/, "");
  if (!normalized) return null;

  if (/^\d{1,3}$/.test(normalized)) {
    return cardByNumber(Number(normalized))?.number || null;
  }

  const slug = assetSlug(normalized);
  const matchedCard = state.cards.find((card) => {
    return (
      assetSlug(card.name) === slug ||
      nameKey(card.name) === nameKey(normalized) ||
      nameKey(card.rodName) === nameKey(normalized)
    );
  });
  return matchedCard?.number || null;
}

function cardByNumber(number) {
  return state.cards.find((card) => card.number === number) || null;
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
  return normalizeText(value);
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
