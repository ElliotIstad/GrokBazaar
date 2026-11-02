import { createFileRoute, Link } from "@tanstack/react-router";
import { METRIC_GROUPS, METRICS } from "@/lib/bazaar/metrics";

export const Route = createFileRoute("/guide")({
  component: Guide,
});

function Guide() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <div>
        <Link to="/" className="text-sm text-primary">
          Back to the desk
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">How the numbers are defined</h1>
        <p className="mt-3 text-muted">
          Hypixel is the live source. Nothing here is filled with zero when a field is missing. Order-book quantity is
          not traded volume. The visible top-30 summary is not the whole book.
        </p>
      </div>
      <section className="flex flex-col gap-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Prices</h2>
        <p>
          Instant buy is the cheapest <span className="font-mono">pricePerUnit</span> in <span className="font-mono">buy_summary</span>.
          Instant sell is the highest <span className="font-mono">pricePerUnit</span> in <span className="font-mono">sell_summary</span>.
          That matches what a one-unit instant buy pays and what a one-unit instant sell receives, before tax.
        </p>
        <p>
          Weighted buy and weighted sell are <span className="font-mono">quick_status.buyPrice</span> and{" "}
          <span className="font-mono">sellPrice</span>: the top 2% of that side by volume, not the next tick and not an
          average of every order. They are cleared when that side has no quantity.
        </p>
        <h2 className="text-lg font-semibold">Orders versus trades</h2>
        <p>
          <span className="font-mono">buyVolume</span> and <span className="font-mono">sellVolume</span> are items sitting
          in active orders. <span className="font-mono">buyMovingWeek</span> and <span className="font-mono">sellMovingWeek</span>{" "}
          are units transacted over seven days plus the live state. Buy per hour is that weekly counter divided by 168.
          It is an average, not a count of the last clock hour.
        </p>
        <h2 className="text-lg font-semibold">Order value</h2>
        <p>
          Estimated buy-side order value is full buy-side quantity times the weighted buy price. Deeper orders are
          usually worse than the top 2%, so this estimate runs high. Visible buy-summary value is the exact sum of the
          returned levels only. Those two are never labeled as each other. The example preset uses the estimate.
        </p>
        <h2 className="text-lg font-semibold">Other sources</h2>
        <p>
          SkyCofl supplies names Hypixel’s item list does not have, and history when you open a product. A Coflnet name
          never replaces a Hypixel name; disagreements are shown. SkyCofl history volume is an order-book snapshot.
          skyblock.finance and skyblock.bz are listed as unused because they had no reliable public JSON feed.
        </p>
        <p>
          Your own scans are stored in this browser. Price change and volatility come only from those scans. A drop in
          the seven-day counter is shown as a negative delta, because the window also forgets old trades. Changes in
          resting order quantity are not called volume.
        </p>
      </section>
      {METRIC_GROUPS.map((group) => (
        <section key={group}>
          <h2 className="mb-3 text-lg font-semibold">{group}</h2>
          <div className="flex flex-col gap-3">
            {METRICS.filter((metric) => metric.group === group).map((metric) => (
              <article key={metric.id} className="rounded-md border border-border bg-surface px-3 py-3">
                <h3 className="text-sm font-medium">{metric.label}</h3>
                <p className="mt-1 text-sm text-muted">{metric.description}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
