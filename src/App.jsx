import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Command, ChevronRight, TrendingUp, TrendingDown, Bell, Wifi, WifiOff,
  RefreshCw, AlertCircle,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* TOKENS (shared brand system)                                            */
/* ---------------------------------------------------------------------- */
const C = {
  bg: "#0A0E14", panel: "#10151D", panel2: "#0D1119",
  hair: "#1E2530", hairSoft: "#161B24",
  text: "#E6EAF0", sub: "#8A94A6", faint: "#5B6373",
  gold: "#C9A15C", goldDim: "#8A7043",
  pos: "#3FB68B", neg: "#E2604F", warn: "#D9A441", blue: "#5B8DEF",
};

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
.fit-root { font-family: 'Inter', sans-serif; background:${C.bg}; color:${C.text}; }
.fit-display { font-family: 'Space Grotesk', sans-serif; }
.fit-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.fit-row:hover { background:${C.hairSoft}; }
@keyframes flashGreen { 0%{ background:rgba(63,182,139,0.25);} 100%{ background:transparent;} }
@keyframes flashRed { 0%{ background:rgba(226,96,79,0.25);} 100%{ background:transparent;} }
.flash-up { animation: flashGreen 0.9s ease-out; }
.flash-down { animation: flashRed 0.9s ease-out; }
`;

/* ---------------------------------------------------------------------- */
/* CONFIG                                                                    */
/* ---------------------------------------------------------------------- */
// ⚠️ DEMO ONLY: the key is exposed client-side here on purpose, to prove the
// concept fast. Do NOT commit a real key to a public repo long-term — see
// the note at the bottom of this file for the production-safe pattern.
const FINNHUB_API_KEY = "d9gquahr01qq6537e6dgd9gquahr01qq6537e6e0";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

const WATCHLIST = [
  { ticker: "AAPL", name: "Apple Inc." },
  { ticker: "MSFT", name: "Microsoft Corp." },
  { ticker: "GOOGL", name: "Alphabet Inc." },
  { ticker: "TSLA", name: "Tesla Inc." },
  { ticker: "AMZN", name: "Amazon.com Inc." },
  { ticker: "NVDA", name: "NVIDIA Corp." },
    { ticker: "SOYBEAN (ZS)", name: "SOYBEAN.CAPITALCOM" },
];

const REFRESH_SECONDS = 20; // well within Finnhub's 60 calls/min free limit (6 tickers x 3/min = 18/min)

/* ---------------------------------------------------------------------- */
/* DATA FETCH                                                               */
/* ---------------------------------------------------------------------- */
async function fetchQuote(ticker) {
  const res = await fetch(`${FINNHUB_BASE}/quote?symbol=${ticker}&token=${FINNHUB_API_KEY}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Finnhub returns all-zero payload for an invalid symbol/key rather than an HTTP error
  if (data.c === 0 && data.pc === 0) throw new Error("No data (check symbol or API key)");
  return {
    ticker,
    price: data.c,
    high: data.h,
    low: data.l,
    open: data.o,
    prevClose: data.pc,
    change: data.d,
    changePct: data.dp,
    timestamp: data.t,
  };
}

/* ---------------------------------------------------------------------- */
/* PRIMITIVES                                                                */
/* ---------------------------------------------------------------------- */
function Panel({ title, right, children, className = "" }) {
  return (
    <div className={className} style={{ background: C.panel, border: `1px solid ${C.hair}` }}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${C.hair}` }}>
          <span className="text-[11px] tracking-widest uppercase" style={{ color: C.faint }}>{title}</span>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* MAIN                                                                      */
/* ---------------------------------------------------------------------- */
export default function USMarketDemo() {
  const [quotes, setQuotes] = useState({});
  const [flash, setFlash] = useState({});
  const [status, setStatus] = useState("connecting"); // connecting | live | error
  const [errorMsg, setErrorMsg] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const prevPrices = useRef({});

  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.all(WATCHLIST.map((w) => fetchQuote(w.ticker)));
      const next = {};
      const flashes = {};
      for (const r of results) {
        const prev = prevPrices.current[r.ticker];
        if (prev !== undefined && prev !== r.price) {
          flashes[r.ticker] = r.price > prev ? "flash-up" : "flash-down";
        }
        next[r.ticker] = r;
        prevPrices.current[r.ticker] = r.price;
      }
      setQuotes(next);
      setFlash(flashes);
      setStatus("live");
      setErrorMsg("");
      setLastUpdated(new Date());
      setCountdown(REFRESH_SECONDS);
      setTimeout(() => setFlash({}), 900);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message || "Fetch failed");
    }
  }, []);

  useEffect(() => {
    loadAll();
    const poll = setInterval(loadAll, REFRESH_SECONDS * 1000);
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : REFRESH_SECONDS)), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [loadAll]);

  return (
    <div className="fit-root w-full h-full min-h-screen text-sm">
      <style>{fontImport}</style>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ borderBottom: `1px solid ${C.hair}`, background: C.panel2 }}>
        <div className="flex items-center gap-4 text-[12px]" style={{ color: C.faint }}>
          <span className="fit-display tracking-widest" style={{ color: C.sub }}>US MARKET — LIVE DEMO</span>
          <ChevronRight size={12} />
          <span className="fit-mono" style={{ color: C.text }}>NYSE / NASDAQ</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "live" && (
            <span className="fit-mono text-[10px] px-2 py-1 flex items-center gap-1.5" style={{ color: C.pos, border: `1px solid ${C.pos}` }}>
              <Wifi size={11} /> LIVE
            </span>
          )}
          {status === "error" && (
            <span className="fit-mono text-[10px] px-2 py-1 flex items-center gap-1.5" style={{ color: C.neg, border: `1px solid ${C.neg}` }}>
              <WifiOff size={11} /> ERROR
            </span>
          )}
          {status === "connecting" && (
            <span className="fit-mono text-[10px] px-2 py-1" style={{ color: C.faint, border: `1px solid ${C.faint}` }}>
              CONNECTING…
            </span>
          )}
        </div>
      </div>

      <div className="p-5 max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="fit-display font-semibold text-[20px]">Live Quote Feed</h1>
            <p className="text-[12px] mt-1" style={{ color: C.faint }}>
              Real data from Finnhub — auto-refreshes every {REFRESH_SECONDS}s, no manual upload
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 fit-mono text-[11px]" style={{ color: C.faint }}>
              <RefreshCw size={11} className={status === "live" ? "" : "opacity-40"} />
              next refresh in {countdown}s
            </div>
            {lastUpdated && (
              <div className="fit-mono text-[10px] mt-1" style={{ color: C.faint }}>
                last updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {status === "error" && (
          <Panel className="mb-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} style={{ color: C.neg, flexShrink: 0, marginTop: 1 }} />
              <div>
                <div className="text-[13px]" style={{ color: C.text }}>Couldn't fetch live data</div>
                <div className="text-[12px] mt-1" style={{ color: C.faint }}>{errorMsg}</div>
                <div className="text-[11px] mt-2" style={{ color: C.faint }}>
                  Common causes: API key invalid/rotated, free-tier rate limit hit (60/min), or no internet.
                </div>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Watchlist">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.hair}` }}>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-left" style={{ color: C.faint }}>Ticker</th>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-left" style={{ color: C.faint }}>Company</th>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-right" style={{ color: C.faint }}>Price</th>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-right" style={{ color: C.faint }}>Change</th>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-right" style={{ color: C.faint }}>High</th>
                <th className="text-[10px] uppercase tracking-wider font-normal py-2 text-right" style={{ color: C.faint }}>Low</th>
              </tr>
            </thead>
            <tbody>
              {WATCHLIST.map((w) => {
                const q = quotes[w.ticker];
                const positive = q && q.change >= 0;
                return (
                  <tr key={w.ticker} className={`fit-row ${flash[w.ticker] || ""}`} style={{ borderBottom: `1px solid ${C.hairSoft}` }}>
                    <td className="py-2.5 fit-mono text-[13px]" style={{ color: C.text }}>{w.ticker}</td>
                    <td className="py-2.5 text-[12px]" style={{ color: C.sub }}>{w.name}</td>
                    <td className="py-2.5 fit-mono text-[13px] text-right" style={{ color: C.text }}>
                      {q ? `$${q.price.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2.5 fit-mono text-[12px] text-right" style={{ color: q ? (positive ? C.pos : C.neg) : C.faint }}>
                      {q ? (
                        <span className="flex items-center gap-1 justify-end">
                          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {positive ? "+" : ""}{q.change.toFixed(2)} ({positive ? "+" : ""}{q.changePct.toFixed(2)}%)
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 fit-mono text-[12px] text-right" style={{ color: C.faint }}>{q ? `$${q.high.toFixed(2)}` : "—"}</td>
                    <td className="py-2.5 fit-mono text-[12px] text-right" style={{ color: C.faint }}>{q ? `$${q.low.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <p className="text-[11px] mt-4" style={{ color: C.faint }}>
          This proves the concept: no file upload, no manual refresh — the table above updates itself
          from a live feed. This is what "real-time" looks like once a legal data source is wired in.
        </p>
      </div>
    </div>
  );
}

/*
 * PRODUCTION NOTE (read before shipping this beyond a demo):
 * The API key above is visible to anyone who opens browser dev tools or views
 * the deployed site's source — fine for a quick proof-of-concept, not fine
 * long-term. The correct pattern is a tiny backend proxy (e.g. a Vercel
 * serverless function at /api/quote) that holds the key server-side and the
 * frontend calls your own /api/quote endpoint instead of Finnhub directly.
 * Ask me to build that proxy when you're ready to move past the demo stage.
 */
