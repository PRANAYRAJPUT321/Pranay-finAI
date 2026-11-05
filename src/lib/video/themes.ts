/**
 * Chooses the cartoon illustration for a lesson from its title and topic.
 * Pure and deterministic (unit tested). Order matters: more specific themes
 * are checked first.
 */

export type ToonTheme =
  | "bond"
  | "timeline"
  | "growth"
  | "scale"
  | "shield"
  | "magnifier"
  | "bell"
  | "pie"
  | "handshake"
  | "umbrella"
  | "buildings"
  | "factory"
  | "globe"
  | "piggy"
  | "chart"
  | "calculator";

const RULES: [ToonTheme, RegExp][] = [
  ["bond", /\b(bonds?|fixed income|coupon|yield|duration|convexity|debenture|treasur(y|ies)|credit spread)/i],
  ["shield", /\b(ethic|professional standards?|conduct|fiduciary|integrity|compliance|code of|misconduct|insider|conflicts? of interest|regulat)/i],
  ["timeline", /\b(npv|irr|net present|cash flows?|capital budgeting|discount(ed|ing)?|payback|annuit(y|ies)|perpetuit)/i],
  ["growth", /\b(time value|compound|interest|future value|present value|growth|return on investment)/i],
  ["magnifier", /\b(audit|assurance|ratios?|dupont|financial statement analysis|analysis of|forensic|internal control|evidence)/i],
  ["buildings", /\b(real estate|real assets|property|reits?|alternative|private equity|hedge funds?|infrastructure|commodit|venture)/i],
  ["scale", /\b(accounting|balance sheet|journal|ledger|double[- ]entry|trial balance|equation|liabilit|depreciation|inventor(y|ies)|revenue recognition|financial reporting|ifrs|gaap)/i],
  ["bell", /\b(statistic|probabilit|quantitative|distribution|regression|variance|standard deviation|sampling|hypothesis|correlation)/i],
  ["pie", /\b(portfolio|diversif|asset allocation|mutual funds?|funds?\b|index|etf)/i],
  ["handshake", /\b(derivative|options?\b|futures?|forwards?|swaps?|contract|law|agreement|agency|negotiable)/i],
  ["umbrella", /\b(risk|insurance|hedg|value at risk|credit risk|operational|protection)/i],
  ["factory", /\b(corporate|cost|managerial|capital structure|wacc|budget|production|operations|working capital|break[- ]even|cvp)/i],
  ["globe", /\b(econom|macro|micro|gdp|inflation|monetary|fiscal|currenc|exchange rate|trade|demand|supply|elasticit|market structure)/i],
  ["piggy", /\b(retirement|planning|saving|tax|personal finance|estate|education funding|household|pension)/i],
  ["chart", /\b(equit(y|ies)|stocks?|shares?|valuation|market|investment|dividend|earnings)/i],
];

export function themeFor(...texts: (string | null | undefined)[]): ToonTheme {
  const hay = texts.filter(Boolean).join(" · ");
  for (const [theme, re] of RULES) if (re.test(hay)) return theme;
  return "calculator";
}

/** Numbers worth animating in a worked example, e.g. "80,000", "8%", "$1,200" (at most `max`). */
export function keyNumbers(text: string, max = 5): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[₹$£€]?\d[\d,]*(?:\.\d+)?%?/g)) {
    const v = m[0].replace(/,$/, "");
    if (v.replace(/\D/g, "").length === 0 || out.includes(v)) continue;
    // Skip lone single digits such as "year 2" or "Step 1".
    if (/^\d$/.test(v)) continue;
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}
