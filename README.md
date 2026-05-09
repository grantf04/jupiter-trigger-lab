# Jupiter Trigger Lab

Jupiter Trigger Lab is a no-wallet strategy workbench built for the Superteam Earn / Jupiter “Not Your Regular Bounty” track.

It uses live Jupiter data to:

- Resolve token metadata through the Tokens v2 search endpoint.
- Pull current USD prices and 24-hour movement through Price v3.
- Score tokens by volatility, liquidity, and available trading-signal fields.
- Generate a non-executing Trigger-style ladder plan.
- Capture endpoint timing evidence for the accompanying DX report.

The app never asks for a wallet, never signs transactions, and never uses seed money. It is a planning and developer-experience artifact only.

## Run

```bash
npx serve .
```

Then open the printed local URL.

## Files

- `index.html` - static app shell
- `src/app.js` - Jupiter API integration and planner
- `styles.css` - responsive interface
- `DX-REPORT.md` - developer-experience report for the bounty submission
