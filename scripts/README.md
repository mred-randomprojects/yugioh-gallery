# Local Data Import

The app runs from `file://`, so the in-app browser blocks live cross-origin API calls. Use these scripts from a terminal to generate `data.js`.

## 1. Test sources

```bash
node scripts/test-sources.mjs
```

Look for a pair that returns `OK` for gallery and list, with high `galleryNumbers`, `deckCost=true`, `atk=true`, `def=true`, and many `imageRefs`.

## 2. Import data

If the downloaded Yugipedia list HTML is present, use it as the stats source and write a CSV for analysis:

```bash
node scripts/import-data.mjs --source=local-list --csv=reshef-cards.csv
```

The CSV has the same normalized fields used by the app: number, name, cost, Duelist Level, alignment, type, level, ATK, DEF, password, status, kind, and image.

## 3. Download card images

The browser can display the Fandom gallery because it lazy-loads images from Fandom's CDN while the page is open. To make the static archive fully local, download those files and write an image manifest:

```bash
node scripts/download-images.mjs
node scripts/import-data.mjs --source=local-list --csv=reshef-cards.csv
```

Images are saved under `assets/cards/`, and `data.js` will use `assets/cards/images.json` automatically when it exists.

You can also try the default auto mode:

```bash
node scripts/import-data.mjs
```

If a specific source looked best in the test output:

```bash
node scripts/import-data.mjs --source=yugipedia-gallery-fandom-list
node scripts/import-data.mjs --source=yugipedia-gallery-local-list
node scripts/import-data.mjs --source=yugipedia-api
node scripts/import-data.mjs --source=fandom-api
node scripts/import-data.mjs --source=yugipedia-reader
node scripts/import-data.mjs --source=fandom-reader
```

If only a text source works and it has stats but no image URLs, you can still generate the data:

```bash
node scripts/import-data.mjs --source=fandom-reader --allow-missing-images
```

Reload `index.html` after `data.js` is written.
