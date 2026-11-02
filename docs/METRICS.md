# Metric definitions

The catalogue of every column, filter, and sort field lives in `src/lib/bazaar/metrics.ts` and is rendered in the app under Metric guide. This file records the rules those descriptions rely on.

## Units that must not be mixed

- **Unit price** is coins per item. **Order value** is coins, and only when both a price and a quantity exist.
- **Instant buy** is what you pay to buy one unit now. **Instant sell** is what you receive to sell one unit now, before the tax setting.
- **Order quantity** (`buyVolume`, `sellVolume`) is resting liquidity. **Week counters** (`buyMovingWeek`, `sellMovingWeek`) are executed units.
- **Buy per hour** is `buyMovingWeek / 168`. Same for sell. That is a seven-day average, not the last hour. A true zero week stays zero. A missing week stays blank.
- **Estimated order value** is full-side quantity times the top-2% weighted price. It is biased high. **Visible summary value** sums only the returned levels. Neither is renamed to look like the other.
- **Estimated turnover** prices the seven-day average flow at the current weighted prices. It is not observed coin volume.
- **Depth** is only inside the returned summary, within 1%, 5%, or 10% of the best price on that side.

## Missing data

Comparisons fail when the metric is blank. Negating the condition does not let the blank through. Use “is unavailable” for that. Sort places blanks last in both directions, then keeps the original order.

## Tax

“Instant round trip after tax” is `instantSell * (1 - tax) - instantBuy`. The default tax is 1.25% and can be changed in Settings. It is not applied silently to other metrics.

## History

Percent change and volatility use only scans stored in this browser, or a SkyCofl series shown separately on the product. Volatility is the coefficient of variation and needs three points. The week-counter delta since the previous scan can be negative. Resting quantity is not differenced into a fake trade count.

## Conflicts

Hypixel wins for the live table. SkyCofl history is labeled and compared. The product panel shows both weighted prices and the percent gap. It does not average them.
