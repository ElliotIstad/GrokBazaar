import { r as METRIC_GROUPS, t as METRICS } from "./metrics-CuiuGo0x.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guide-B-Y7NUcB.js
var import_jsx_runtime = require_jsx_runtime();
function Guide() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "text-sm text-primary",
					children: "Back to the desk"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-semibold tracking-tight",
					children: "How the numbers are defined"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: "Hypixel is the live source. Nothing here is filled with zero when a field is missing. Order-book quantity is not traded volume. The visible top-30 summary is not the whole book."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-3 text-sm leading-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Prices"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Instant buy is the cheapest ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "pricePerUnit"
						}),
						" in ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "buy_summary"
						}),
						". Instant sell is the highest ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "pricePerUnit"
						}),
						" in ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "sell_summary"
						}),
						". That matches what a one-unit instant buy pays and what a one-unit instant sell receives, before tax."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Weighted buy and weighted sell are ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "quick_status.buyPrice"
						}),
						" and",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "sellPrice"
						}),
						": the top 2% of that side by volume, not the next tick and not an average of every order. They are cleared when that side has no quantity."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Orders versus trades"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "buyVolume"
						}),
						" and ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "sellVolume"
						}),
						" are items sitting in active orders. ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "buyMovingWeek"
						}),
						" and ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: "sellMovingWeek"
						}),
						" ",
						"are units transacted over seven days plus the live state. Buy per hour is that weekly counter divided by 168. It is an average, not a count of the last clock hour."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Order value"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Estimated buy-side order value is full buy-side quantity times the weighted buy price. Deeper orders are usually worse than the top 2%, so this estimate runs high. Visible buy-summary value is the exact sum of the returned levels only. Those two are never labeled as each other. The example preset uses the estimate." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Other sources"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "SkyCofl supplies names Hypixel’s item list does not have, and history when you open a product. A Coflnet name never replaces a Hypixel name; disagreements are shown. SkyCofl history volume is an order-book snapshot. skyblock.finance and skyblock.bz are listed as unused because they had no reliable public JSON feed." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your own scans are stored in this browser. Price change and volatility come only from those scans. A drop in the seven-day counter is shown as a negative delta, because the window also forgets old trades. Changes in resting order quantity are not called volume." })
				]
			}),
			METRIC_GROUPS.map((group) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-3 text-lg font-semibold",
				children: group
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-col gap-3",
				children: METRICS.filter((metric) => metric.group === group).map((metric) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-md border border-border bg-surface px-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-medium",
						children: metric.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: metric.description
					})]
				}, metric.id))
			})] }, group))
		]
	});
}
//#endregion
export { Guide as component };
