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

## Why other stores are manual
Kroger is the only one of these chains with a public pricing API. Publix, Aldi, Food Lion, Sprouts,
Walmart and Target don't offer one, and scraping their sites breaks their terms of service and breaks often.
Prices for those stores come from you: log them from weekly ads (linked in the Stores tab) or receipts.
Data is stored in your browser's localStorage, so use Export to back it up.
