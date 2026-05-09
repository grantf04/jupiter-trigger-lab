const TOKEN_SEARCH = "https://lite-api.jup.ag/tokens/v2/search";
const PRICE_V3 = "https://lite-api.jup.ag/price/v3";

const state = {
  records: [],
  evidence: null,
  planText: "",
};

const ids = {
  tokenInput: document.querySelector("#tokenInput"),
  notionalInput: document.querySelector("#notionalInput"),
  riskInput: document.querySelector("#riskInput"),
  refreshBtn: document.querySelector("#refreshBtn"),
  copyPlanBtn: document.querySelector("#copyPlanBtn"),
  copyEvidenceBtn: document.querySelector("#copyEvidenceBtn"),
  runStatus: document.querySelector("#runStatus"),
  resolvedMetric: document.querySelector("#resolvedMetric"),
  roundTripMetric: document.querySelector("#roundTripMetric"),
  latencyMetric: document.querySelector("#latencyMetric"),
  bestMetric: document.querySelector("#bestMetric"),
  tokenTable: document.querySelector("#tokenTable"),
  planOutput: document.querySelector("#planOutput"),
};

const formatUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});

const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function parseQueries(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

async function timedJson(url, label) {
  const started = performance.now();
  const response = await fetch(url);
  const elapsedMs = Math.round(performance.now() - started);
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
  return {
    label,
    url,
    elapsedMs,
    body: await response.json(),
  };
}

async function resolveToken(query) {
  const url = `${TOKEN_SEARCH}?query=${encodeURIComponent(query)}`;
  const result = await timedJson(url, `tokens:${query}`);
  const tokens = Array.isArray(result.body) ? result.body : [];
  const best =
    tokens.find((token) => token.symbol?.toLowerCase() === query.toLowerCase()) ||
    tokens.find((token) => token.id?.toLowerCase() === query.toLowerCase()) ||
    tokens[0];
  return { best, trace: result };
}

function scoreToken(token, price) {
  const change = price?.priceChange24h ?? token?.stats24h?.priceChange ?? 0;
  const volume = token?.stats24h?.buyVolume + token?.stats24h?.sellVolume || 0;
  const organic =
    token?.stats24h?.buyOrganicVolume + token?.stats24h?.sellOrganicVolume || 0;
  const organicShare = volume > 0 ? organic / volume : 0;
  const liquidity = price?.liquidity ?? token?.liquidity ?? 0;
  const volatility = Math.abs(change);
  return Math.round(
    Math.min(100, volatility * 3 + Math.log10(Math.max(liquidity, 1)) * 8 + organicShare * 25),
  );
}

function classify(record) {
  if (record.liquidity < 100000) return "Thin";
  if (record.score >= 74 && Math.abs(record.change24h) >= 4) return "Hot";
  if (record.score >= 58) return "Watch";
  return "Calm";
}

function buildRows(records) {
  ids.tokenTable.innerHTML = "";
  const header = document.createElement("div");
  header.className = "row header";
  ["Token", "Price", "24h", "Liquidity", "Score", "Setup"].forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = label;
    header.append(cell);
  });
  ids.tokenTable.append(header);

  records.forEach((record) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="cell token-cell">
        <img src="${record.icon || ""}" alt="" loading="lazy" />
        <div><span class="symbol">${record.symbol}</span><span class="name">${record.name}</span></div>
      </div>
      <div class="cell">${formatUsd.format(record.price)}</div>
      <div class="cell">${record.change24h.toFixed(2)}%</div>
      <div class="cell">${compactUsd.format(record.liquidity)}</div>
      <div class="cell">${record.score}/100</div>
      <div class="cell"><span class="tag ${record.label === "Hot" ? "hot" : record.label === "Watch" ? "warn" : ""}">${record.label}</span></div>
    `;
    ids.tokenTable.append(row);
  });
}

function riskSettings() {
  const risk = ids.riskInput.value;
  if (risk === "defensive") return { offsets: [-3, -6, 4], split: [0.25, 0.35, 0.4] };
  if (risk === "aggressive") return { offsets: [-5, -9, 7], split: [0.2, 0.35, 0.45] };
  return { offsets: [-4, -7, 5.5], split: [0.25, 0.35, 0.4] };
}

function buildPlan(records) {
  const [primary] = [...records].sort((a, b) => b.score - a.score);
  if (!primary) {
    state.planText = "No tokens resolved.";
    ids.planOutput.innerHTML = `<p class="error">Run analysis to generate a plan.</p>`;
    return;
  }

  const notional = Number(ids.notionalInput.value || 500);
  const settings = riskSettings();
  const ladder = settings.offsets.map((offset, index) => {
    const side = offset < 0 ? "BUY" : "SELL";
    const target = primary.price * (1 + offset / 100);
    const allocation = Math.round(notional * settings.split[index]);
    return { side, offset, target, allocation };
  });

  state.planText = [
    `Jupiter Trigger Lab plan for ${primary.symbol}`,
    `Spot: ${formatUsd.format(primary.price)} | 24h: ${primary.change24h.toFixed(2)}% | score: ${primary.score}/100`,
    ...ladder.map(
      (step) =>
        `${step.side} ${formatUsd.format(step.allocation)} notional at ${formatUsd.format(step.target)} (${step.offset > 0 ? "+" : ""}${step.offset}%)`,
    ),
    "Execution note: this is a non-signing template. To place real Trigger orders, the user must connect a wallet and review Jupiter's official Trigger order flow.",
  ].join("\n");

  ids.planOutput.innerHTML = `
    <article class="plan">
      <h3>${primary.symbol} trigger ladder</h3>
      <div class="ladder">
        ${ladder
          .map(
            (step) => `
              <div>
                <strong>${step.side}</strong>
                <span>${step.offset > 0 ? "+" : ""}${step.offset}% target</span>
                <span>${formatUsd.format(step.target)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
      <p class="name">No wallet connection. No transaction signing. Output is a reviewable strategy template.</p>
    </article>
  `;
}

function updateMetrics(records, traces) {
  const latencies = traces.map((trace) => trace.elapsedMs).sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;
  ids.resolvedMetric.textContent = String(records.length);
  ids.roundTripMetric.textContent = String(traces.length);
  ids.latencyMetric.textContent = `${median} ms`;
  ids.bestMetric.textContent = records[0]?.symbol || "None";
}

async function run() {
  ids.runStatus.textContent = "Resolving tokens";
  ids.refreshBtn.disabled = true;
  ids.tokenTable.innerHTML = "";
  ids.planOutput.innerHTML = "";

  try {
    const queries = parseQueries(ids.tokenInput.value);
    const resolved = await Promise.all(queries.map(resolveToken));
    const tokens = resolved.map((item) => item.best).filter(Boolean);
    const mints = tokens.map((token) => token.id).join(",");
    ids.runStatus.textContent = "Fetching prices";
    const priceTrace = await timedJson(`${PRICE_V3}?ids=${encodeURIComponent(mints)}`, "price:v3");

    const records = tokens
      .map((token) => {
        const price = priceTrace.body[token.id] || {};
        const record = {
          mint: token.id,
          symbol: token.symbol || token.id.slice(0, 4),
          name: token.name || token.id,
          icon: token.icon,
          price: price.usdPrice ?? token.usdPrice ?? 0,
          change24h: price.priceChange24h ?? token.stats24h?.priceChange ?? 0,
          liquidity: price.liquidity ?? token.liquidity ?? 0,
        };
        record.score = scoreToken(token, price);
        record.label = classify(record);
        return record;
      })
      .sort((a, b) => b.score - a.score);

    const traces = [...resolved.map((item) => item.trace), priceTrace];
    state.records = records;
    state.evidence = {
      generatedAt: new Date().toISOString(),
      endpointCount: traces.length,
      traces: traces.map(({ label, url, elapsedMs }) => ({ label, url, elapsedMs })),
      records: records.map(({ mint, symbol, price, change24h, liquidity, score, label }) => ({
        mint,
        symbol,
        price,
        change24h,
        liquidity,
        score,
        label,
      })),
    };

    buildRows(records);
    buildPlan(records);
    updateMetrics(records, traces);
    ids.runStatus.textContent = "Live data loaded";
  } catch (error) {
    ids.runStatus.textContent = "Run failed";
    ids.tokenTable.innerHTML = `<p class="error">${error.message}</p>`;
  } finally {
    ids.refreshBtn.disabled = false;
  }
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

ids.refreshBtn.addEventListener("click", run);
ids.copyPlanBtn.addEventListener("click", () => copyText(state.planText));
ids.copyEvidenceBtn.addEventListener("click", () =>
  copyText(JSON.stringify(state.evidence, null, 2)),
);

run();
