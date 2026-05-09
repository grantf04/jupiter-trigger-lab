# Jupiter Developer Platform DX Report

Project: Jupiter Trigger Lab

Repo: https://github.com/grantf04/jupiter-trigger-lab

Live app: https://grantf04.github.io/jupiter-trigger-lab/

Demo screenshot: https://github.com/grantf04/jupiter-trigger-lab/blob/main/docs-demo.png

## What I Built

Jupiter Trigger Lab is a no-wallet browser app that turns live Jupiter token data into a reviewable Trigger/DCA strategy template. It uses:

- Tokens v2 search for token discovery and metadata.
- Price v3 for current USD price, liquidity, and 24-hour price movement.
- A local strategy planner that proposes buy/sell ladder levels without signing or submitting transactions.

The design goal was to test whether a coding agent can go from “find Jupiter APIs” to “ship a useful market tool” without custody, seed funds, or wallet signing.

## Onboarding Time

First successful API call took about 4 minutes once I stopped looking for a machine-readable docs index on `developers.jup.ag` and went directly to the lite API endpoints.

Working calls used in the app:

```text
https://lite-api.jup.ag/tokens/v2/search?query=SOL
https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112
```

The endpoints are fast and CORS-friendly from a static browser app. That was the best part of the experience.

## What Was Confusing

1. `https://developers.jup.ag/llms.txt` returned a 404 page during my build. The bounty text highlights LLM-oriented docs and AI stack usage, so I expected the new developer platform domain to expose a canonical machine-readable index.

2. The API key story was unclear for a zero-wallet prototype. The bounty says one key gets everything, but the lite endpoints worked without any key. I could build the project, but I could not tell which calls were intended to be keyed, rate-limited, or production-safe.

3. Price v3 is excellent for direct mint lookups but does not include enough symbol/name context to stand alone. I had to pair it with Tokens v2 search and maintain the mapping client-side.

4. Tokens v2 search returns a rich payload. That is useful, but the response shape is large for a search box. It would help to offer documented field projections or a concise mode for agents and dashboards.

5. Trigger/Recurring are clearly wallet-action APIs, but the docs boundary between “build a quote/template” and “execute a signed order” should be more explicit. For a no-funds agent build, I wanted a sandbox payload validator that confirmed an order shape without creating anything.

## API Behavior Notes

- Tokens search response included `stats5m`, `stats1h`, and other trading-signal fields. These are valuable for strategy generation and should be documented as first-class fields, not just response examples.
- Price v3 returned `createdAt`, `liquidity`, `usdPrice`, `blockId`, `decimals`, and `priceChange24h`. Those fields are enough to create a ranked opportunity table.
- Browser CORS worked for both endpoints, which made the static prototype simple to deploy.
- The error surface was not tested deeply because the public endpoints succeeded reliably during this build.

## AI Stack Feedback

The bounty specifically asks for feedback on Skills, CLI, Docs MCP, and LLM docs.

- I found the platform concept strong: a JSON-native CLI plus agent skills is exactly the right shape for agent builds.
- I could not find a working `llms.txt` at the new developer platform domain. That is the biggest miss because an agent will try that before reading visual docs.
- The agent workflow needs a single copyable “bootstrap for Codex/Claude/Cursor” block: install CLI, authenticate, fetch docs, run one price query, run one swap/trigger dry-run.
- A dry-run command would be valuable: `jup trigger validate --input order.json` or similar. It would let agents test integrations without requiring a wallet or funds.
- Docs MCP should expose canonical endpoint metadata: auth requirement, rate limit tier, supported networks, example response, and whether a no-wallet dry run exists.

## How I Would Rebuild The Developer Platform

1. Put a “First API call” console above the fold. Let a developer run Price v3 or Tokens v2 immediately before creating a key.

2. Make auth status explicit per endpoint:

   - public lite
   - key required
   - wallet signature required
   - sandbox/dry-run available

3. Add an agent tab with:

   - `llms.txt`
   - `skill.md`
   - MCP endpoint
   - CLI install
   - one smoke-test command
   - one non-custodial dry-run command

4. Add response-shape toggles in docs: compact, full, and TypeScript type.

5. Add a generated OpenAPI/JSON schema bundle for each API group. Agents can use schemas more reliably than prose.

## What I Wish Existed

- A Trigger order dry-run endpoint that validates route, thresholds, expiry, slippage, and wallet requirements without requiring a signature.
- Field projection for Tokens search, such as `?fields=id,symbol,name,icon,usdPrice,liquidity,stats24h`.
- A docs endpoint that lists current API base URLs, whether they support browser CORS, and whether they require an API key.
- A “strategy simulator” endpoint that can compare Trigger, Recurring, and Swap V2 paths for the same token pair without submitting any transaction.
- Machine-readable examples for agent tests, especially canonical SOL/JUP/USDC fixtures.

## Safety Boundary

The submitted project intentionally does not connect a wallet, request private keys, execute swaps, or place Trigger/Recurring orders. This made it possible to explore the developer experience without using real funds.
