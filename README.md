# Bazaar Desk

A market desk for the whole Hypixel SkyBlock Bazaar. It loads every product, then lets you filter, sort, search, compare, and export without baking a trading strategy into the engine.

## Run

```bash
npm install
npm run dev
```

The dev server listens on port 8080. `npm run test` covers the filter, sort, normalization, and settings engines. `npm run typecheck` and `npm run build` check the app.

## What it uses

- Hypixel `GET /v2/skyblock/bazaar` for the live book and seven-day volumes. No API key.
- Hypixel `GET /v2/resources/skyblock/items` for names, category, rarity, and NPC sell price.
- SkyCofl item names when Hypixel has no entry, and SkyCofl bazaar history when a product is opened.

Definitions, including what is deliberately not combined across sources, are in the in-app Metric guide and in [docs/METRICS.md](docs/METRICS.md). Source notes are in [docs/SOURCES.md](docs/SOURCES.md).

Filters, sorts, columns, presets, and the tax rate used by the after-tax metric are stored in the browser. Scan history for price change is stored in IndexedDB on this device.
