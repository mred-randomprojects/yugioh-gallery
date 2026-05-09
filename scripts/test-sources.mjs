#!/usr/bin/env node

const GALLERY_YUGIPEDIA = "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards_(European_English)";
const LIST_YUGIPEDIA = "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards";
const GALLERY_FANDOM = "Gallery_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards";
const LIST_FANDOM = "List_of_Yu-Gi-Oh!_Reshef_of_Destruction_cards";

const REQUESTS = [
  {
    name: "Yugipedia API gallery",
    url: mediaWikiParseUrl("https://yugipedia.com/api.php", GALLERY_YUGIPEDIA),
  },
  {
    name: "Yugipedia API list",
    url: mediaWikiParseUrl("https://yugipedia.com/api.php", LIST_YUGIPEDIA),
  },
  {
    name: "Fandom API gallery",
    url: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", GALLERY_FANDOM),
  },
  {
    name: "Fandom API list",
    url: mediaWikiParseUrl("https://yugioh.fandom.com/api.php", LIST_FANDOM),
  },
  {
    name: "Yugipedia Reader gallery",
    url: `https://r.jina.ai/https://yugipedia.com/wiki/${encodeURIComponent(GALLERY_YUGIPEDIA).replace(/%2F/g, "/")}`,
  },
  {
    name: "Yugipedia Reader list",
    url: `https://r.jina.ai/https://yugipedia.com/wiki/${encodeURIComponent(LIST_YUGIPEDIA).replace(/%2F/g, "/")}`,
  },
  {
    name: "Fandom Reader gallery",
    url: "https://r.jina.ai/https://yugioh.fandom.com/wiki/Gallery_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
  },
  {
    name: "Fandom Reader list",
    url: "https://r.jina.ai/https://yugioh.fandom.com/wiki/List_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
  },
  {
    name: "Fandom direct gallery",
    url: "https://yugioh.fandom.com/wiki/Gallery_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
  },
  {
    name: "Fandom direct list",
    url: "https://yugioh.fandom.com/wiki/List_of_Yu-Gi-Oh%21_Reshef_of_Destruction_cards",
  },
];

const timeoutMs = Number(readArg("--timeout", "15000"));

console.log(`Testing ${REQUESTS.length} source URLs with ${timeoutMs}ms timeout each.\n`);

for (const request of REQUESTS) {
  await testRequest(request);
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

async function testRequest(request) {
  const startedAt = Date.now();
  try {
    const { status, statusText, headers, text } = await fetchText(request.url);
    const elapsed = Date.now() - startedAt;
    const contentType = headers.get("content-type") || "unknown";
    const body = extractApiHtml(text) || text;
    const hints = collectHints(body);

    console.log(`OK   ${request.name}`);
    console.log(`     status: ${status} ${statusText}; ${text.length.toLocaleString()} bytes; ${elapsed}ms`);
    console.log(`     type: ${contentType}`);
    console.log(`     hints: galleryNumbers=${hints.galleryNumbers}; deckCost=${hints.deckCost}; atk=${hints.atk}; def=${hints.def}; imageRefs=${hints.imageRefs}`);
    console.log(`     url: ${request.url}\n`);
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    console.log(`FAIL ${request.name}`);
    console.log(`     ${error.message}; ${elapsed}ms`);
    console.log(`     url: ${request.url}\n`);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

function extractApiHtml(text) {
  try {
    const data = JSON.parse(text);
    return data?.parse?.text?.["*"] || "";
  } catch {
    return "";
  }
}

function collectHints(text) {
  return {
    galleryNumbers: (text.match(/#\s*\d{3}/g) || []).length,
    deckCost: /Deck\s+Cost/i.test(text),
    atk: /\bATK\b/i.test(text),
    def: /\bDEF\b/i.test(text),
    imageRefs: (text.match(/<img\b|!\[[^\]]*\]\(|\.(?:png|jpg|jpeg|webp)/gi) || []).length,
  };
}

function readArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
}
