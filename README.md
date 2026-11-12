# Clarksville Grocery Compare

Compare grocery prices and sales across Clarksville, TN stores: Publix, Kroger, Aldi, Food Lion,
Sprouts, Walmart, Target, Sam's Club and the Fort Campbell Commissary (add others in the Stores tab).

## Features
- **Search** your price book; results sorted by **unit price** (oz, lb, fl oz, gal and count are normalized).
- **Sales**: mark prices as sales with an end date; expired sales drop off automatically. "Sales only" filter.
- **Shopping list**: shows the cheapest split trip (best store per item) and the best one-stop store.
- **Live Kroger prices**: real prices and promos from the nearest Kroger via Kroger's free public API.
- Weekly ad links for every store, export/import of your data as JSON.

## Run
```bash
node server.js          # Node 18+, no npm install needed
# open http://localhost:3000
```
For live Kroger prices, create a free app at https://developer.kroger.com (Product scope), then:
```bash
KROGER_CLIENT_ID=xxx KROGER_CLIENT_SECRET=yyy node server.js
```
You can also open `public/index.html` directly; everything works except Live Kroger.

## Where prices come from

| Store | Automatic prices? | How to get current prices |
|---|---|---|
| Kroger | ✅ Official free API ([developer.kroger.com](https://developer.kroger.com)) | "Live Kroger" button in the app, or the Kroger app |
| Publix | ❌ No public API ([API Evangelist profile](https://github.com/api-evangelist/publix-super-markets) confirms none exists) | Publix app → Weekly Ad |
| Aldi | ❌ No public API; product search didn't respond to automated requests | aldi.us or Aldi app, set to your store |
| Food Lion | ❌ No public API; website returned 403 (blocks automated requests) | Food Lion app (MVP card) |
| Sprouts | ❌ No public API | Sprouts app → Weekly Ad |
| Walmart | ❌ No public price API for shoppers | Walmart app, set to your Clarksville store |
| Target | ❌ No public price API for shoppers | Target app (Target Circle) |

**Tip:** the free [Flipp](https://flipp.com) app collects most weekly ads in one place (zip 37040).
Flipp gets ads directly from retailers, who pay it to show them, so it doesn't need to scrape.

For stores without an API, prices come from you: enter them from weekly ads or receipts
(Stores tab links to each weekly ad). We deliberately don't scrape store websites: it breaks their
terms of service, gets blocked, and breaks whenever a site changes.

Data is stored in your browser's localStorage, so use Export to back it up.

## Saving-money routine
1. Check Flipp or the weekly ads for sales on things you buy.
2. Plan meals around the sales.
3. Clip digital coupons in the Kroger, Publix and Food Lion apps.
4. Use Aldi or Walmart as the baseline for everyday staples.
5. Compare unit prices (per oz or per count), not package prices.
6. Log prices from receipts so the app builds your own price history.

## Roadmap
- **Scan ad / receipt:** upload a screenshot, PDF or receipt photo; AI extracts items, prices and
  sale dates and saves them under the right store (needs an AI API key, a few cents per scan).
- Hosting online so it works on your phone, and a shared database so a household stays in sync.
