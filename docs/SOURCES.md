# Sources

## Hypixel Bazaar

`https://api.hypixel.net/v2/skyblock/bazaar`

Public. No API key. The desk caches a successful payload for about 20 seconds and will not hit the network more than once every 15 seconds, even on a forced refresh. Failures retry with backoff on 408, 429, and 5xx. A dead response does not zero-fill the book.

| Field | Meaning used here |
| --- | --- |
| `buy_summary` / `sell_summary` | Top orders Hypixel returned, at most 30 levels. Not the entire book. |
| `buyPrice` / `sellPrice` | Weighted average of the top 2% of that side by volume. |
| `buyVolume` / `sellVolume` | Items in active orders. Not trades. |
| `buyOrders` / `sellOrders` | Count of active orders. |
| `buyMovingWeek` / `sellMovingWeek` | Transacted units over seven days plus the live state. |
| `lastUpdated` | Hypixel's timestamp for the payload. |

Instant buy is the minimum `pricePerUnit` in `buy_summary`. Instant sell is the maximum `pricePerUnit` in `sell_summary`.

## Hypixel items

`https://api.hypixel.net/v2/resources/skyblock/items`

Names, `category`, `tier`, and `npc_sell_price`. Cached for hours. If this call fails, the bazaar scan still proceeds.

## SkyCofl

- `https://sky.coflnet.com/api/items` for display names only when Hypixel has no name. A different Coflnet name is kept as a disagreement, not a replacement.
- `https://sky.coflnet.com/api/bazaar/{id}/history/{hour|day|week}` when a product is opened.

On those history points, `buy` / `sell` track the weighted prices. `buyVolume` / `sellVolume` are order-book snapshots. `buyMovingWeek` / `sellMovingWeek` are the transaction counters. They are not averaged with Hypixel.

Rate limit noted by SkyCofl is on the order of 30 requests / 10 seconds and 100 / minute per IP. History is requested per opened product and cached for a minute.

## Not used

- skyblock.finance did not resolve.
- skyblock.bz served a site but no public JSON bazaar API at the usual paths. The desk does not scrape HTML.

## This browser

Successful scans append a compact snapshot (weighted prices and week counters only) in IndexedDB, capped at 48. That series is the only source for “your history” metrics.
