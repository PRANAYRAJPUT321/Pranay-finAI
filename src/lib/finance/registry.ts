/**
 * Registry of deterministic calculators. Shared by:
 *  - question calcSpec validation ({fn, args} must reproduce the answer key),
 *  - the interactive calculators in the formula library,
 *  - the AI tutor's calculation tools.
 */
import * as F from "./core";

export type ParamKind = "number" | "list";
export type OutputFormat = "money" | "percent" | "number" | "years" | "ratio";

export interface CalcParam {
  name: string;
  label: string;
  kind: ParamKind;
  example: number | number[];
  hint?: string;
}

export interface Calculator {
  key: string;
  label: string;
  description: string;
  params: CalcParam[];
  output: OutputFormat;
  compute: (args: Record<string, number | number[]>) => number;
}

const n = (args: Record<string, number | number[]>, k: string): number => {
  const v = args[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new F.FinanceInputError(`${k} must be a number`);
  return v;
};
const list = (args: Record<string, number | number[]>, k: string): number[] => {
  const v = args[k];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "number" || !Number.isFinite(x))) {
    throw new F.FinanceInputError(`${k} must be a list of numbers`);
  }
  return v;
};

export const calculators: Calculator[] = [
  {
    key: "futureValue",
    label: "Future value",
    description: "FV of a lump sum and/or level annuity (ordinary annuity).",
    params: [
      { name: "pv", label: "Present value", kind: "number", example: 1000 },
      { name: "rate", label: "Rate per period (decimal)", kind: "number", example: 0.05 },
      { name: "periods", label: "Number of periods", kind: "number", example: 10 },
      { name: "pmt", label: "Payment per period", kind: "number", example: 0 },
    ],
    output: "money",
    compute: (a) => F.futureValue(n(a, "pv"), n(a, "rate"), n(a, "periods"), (a.pmt as number) ?? 0).toNumber(),
  },
  {
    key: "presentValue",
    label: "Present value",
    description: "PV of a future lump sum and/or level annuity (ordinary annuity).",
    params: [
      { name: "fv", label: "Future value", kind: "number", example: 1000 },
      { name: "rate", label: "Rate per period (decimal)", kind: "number", example: 0.06 },
      { name: "periods", label: "Number of periods", kind: "number", example: 5 },
      { name: "pmt", label: "Payment per period", kind: "number", example: 0 },
    ],
    output: "money",
    compute: (a) => F.presentValue(n(a, "fv"), n(a, "rate"), n(a, "periods"), (a.pmt as number) ?? 0).toNumber(),
  },
  {
    key: "presentValueAnnuityDue",
    label: "Present value (annuity due)",
    description: "PV of level payments made at the start of each period.",
    params: [
      { name: "pmt", label: "Payment per period", kind: "number", example: 1000 },
      { name: "rate", label: "Rate per period (decimal)", kind: "number", example: 0.05 },
      { name: "periods", label: "Number of periods", kind: "number", example: 5 },
    ],
    output: "money",
    compute: (a) => F.presentValue(0, n(a, "rate"), n(a, "periods"), n(a, "pmt"), 1).toNumber(),
  },
  {
    key: "annuityPayment",
    label: "Loan / annuity payment",
    description: "Level payment that amortises a present value.",
    params: [
      { name: "pv", label: "Present value (loan amount)", kind: "number", example: 200000 },
      { name: "rate", label: "Rate per period (decimal)", kind: "number", example: 0.005 },
      { name: "periods", label: "Number of periods", kind: "number", example: 360 },
    ],
    output: "money",
    compute: (a) => F.annuityPayment(n(a, "pv"), n(a, "rate"), n(a, "periods")).toNumber(),
  },
  {
    key: "effectiveAnnualRate",
    label: "Effective annual rate",
    description: "EAR from a stated annual rate compounded m times per year.",
    params: [
      { name: "statedRate", label: "Stated annual rate (decimal)", kind: "number", example: 0.12 },
      { name: "periodsPerYear", label: "Compounding periods per year", kind: "number", example: 12 },
    ],
    output: "percent",
    compute: (a) => F.effectiveAnnualRate(n(a, "statedRate"), n(a, "periodsPerYear")).toNumber(),
  },
  {
    key: "npv",
    label: "Net present value",
    description: "NPV of cash flows; the first cash flow occurs today (t = 0).",
    params: [
      { name: "rate", label: "Discount rate (decimal)", kind: "number", example: 0.1 },
      { name: "cashFlows", label: "Cash flows (t0, t1, ...)", kind: "list", example: [-1000, 300, 400, 500] },
    ],
    output: "money",
    compute: (a) => F.npv(n(a, "rate"), list(a, "cashFlows")).toNumber(),
  },
  {
    key: "irr",
    label: "Internal rate of return",
    description: "Discount rate that sets NPV to zero.",
    params: [{ name: "cashFlows", label: "Cash flows (t0, t1, ...)", kind: "list", example: [-1000, 300, 400, 500] }],
    output: "percent",
    compute: (a) => F.irr(list(a, "cashFlows")).toNumber(),
  },
  {
    key: "holdingPeriodReturn",
    label: "Holding period return",
    description: "Return over the holding period including income.",
    params: [
      { name: "beginPrice", label: "Beginning price", kind: "number", example: 50 },
      { name: "endPrice", label: "Ending price", kind: "number", example: 54 },
      { name: "income", label: "Income received", kind: "number", example: 1 },
    ],
    output: "percent",
    compute: (a) => F.holdingPeriodReturn(n(a, "beginPrice"), n(a, "endPrice"), (a.income as number) ?? 0).toNumber(),
  },
  {
    key: "bondPrice",
    label: "Bond price",
    description: "Price of an option-free bond on a coupon date.",
    params: [
      { name: "face", label: "Face value", kind: "number", example: 1000 },
      { name: "couponRate", label: "Annual coupon rate (decimal)", kind: "number", example: 0.06 },
      { name: "ytm", label: "Annual yield to maturity (decimal)", kind: "number", example: 0.05 },
      { name: "years", label: "Years to maturity", kind: "number", example: 5 },
      { name: "frequency", label: "Coupons per year", kind: "number", example: 2 },
    ],
    output: "money",
    compute: (a) =>
      F.bondPrice({
        face: n(a, "face"),
        couponRate: n(a, "couponRate"),
        ytm: n(a, "ytm"),
        years: n(a, "years"),
        frequency: (a.frequency as number) ?? 1,
      }).toNumber(),
  },
  {
    key: "bondYield",
    label: "Yield to maturity",
    description: "Annualised YTM implied by a bond's price.",
    params: [
      { name: "price", label: "Price", kind: "number", example: 950 },
      { name: "face", label: "Face value", kind: "number", example: 1000 },
      { name: "couponRate", label: "Annual coupon rate (decimal)", kind: "number", example: 0.05 },
      { name: "years", label: "Years to maturity", kind: "number", example: 5 },
      { name: "frequency", label: "Coupons per year", kind: "number", example: 1 },
    ],
    output: "percent",
    compute: (a) =>
      F.bondYield(n(a, "price"), n(a, "face"), n(a, "couponRate"), n(a, "years"), (a.frequency as number) ?? 1).toNumber(),
  },
  {
    key: "macaulayDuration",
    label: "Macaulay duration",
    description: "PV-weighted average time to receipt of cash flows, in years.",
    params: [
      { name: "face", label: "Face value", kind: "number", example: 100 },
      { name: "couponRate", label: "Annual coupon rate (decimal)", kind: "number", example: 0.05 },
      { name: "ytm", label: "Annual YTM (decimal)", kind: "number", example: 0.05 },
      { name: "years", label: "Years to maturity", kind: "number", example: 3 },
      { name: "frequency", label: "Coupons per year", kind: "number", example: 1 },
    ],
    output: "years",
    compute: (a) =>
      F.macaulayDuration({
        face: n(a, "face"),
        couponRate: n(a, "couponRate"),
        ytm: n(a, "ytm"),
        years: n(a, "years"),
        frequency: (a.frequency as number) ?? 1,
      }).toNumber(),
  },
  {
    key: "modifiedDuration",
    label: "Modified duration",
    description: "Macaulay duration divided by (1 + periodic yield).",
    params: [
      { name: "face", label: "Face value", kind: "number", example: 100 },
      { name: "couponRate", label: "Annual coupon rate (decimal)", kind: "number", example: 0.05 },
      { name: "ytm", label: "Annual YTM (decimal)", kind: "number", example: 0.05 },
      { name: "years", label: "Years to maturity", kind: "number", example: 3 },
      { name: "frequency", label: "Coupons per year", kind: "number", example: 1 },
    ],
    output: "years",
    compute: (a) =>
      F.modifiedDuration({
        face: n(a, "face"),
        couponRate: n(a, "couponRate"),
        ytm: n(a, "ytm"),
        years: n(a, "years"),
        frequency: (a.frequency as number) ?? 1,
      }).toNumber(),
  },
  {
    key: "durationPriceChange",
    label: "Price change from duration",
    description: "Approximate % price change: -ModDur x dy + 0.5 x Convexity x dy^2.",
    params: [
      { name: "modDuration", label: "Modified duration", kind: "number", example: 7.2 },
      { name: "yieldChange", label: "Yield change (decimal)", kind: "number", example: 0.005 },
      { name: "convexity", label: "Convexity", kind: "number", example: 0 },
    ],
    output: "percent",
    compute: (a) => F.durationPriceChange(n(a, "modDuration"), n(a, "yieldChange"), (a.convexity as number) ?? 0).toNumber(),
  },
  {
    key: "gordonGrowthValue",
    label: "Gordon growth value",
    description: "Intrinsic value = D0 x (1 + g) / (r - g).",
    params: [
      { name: "d0", label: "Dividend just paid (D0)", kind: "number", example: 2 },
      { name: "requiredReturn", label: "Required return (decimal)", kind: "number", example: 0.1 },
      { name: "growth", label: "Constant growth rate (decimal)", kind: "number", example: 0.04 },
    ],
    output: "money",
    compute: (a) => F.gordonGrowthValue(n(a, "d0"), n(a, "requiredReturn"), n(a, "growth")).toNumber(),
  },
  {
    key: "capmRequiredReturn",
    label: "CAPM required return",
    description: "E(R) = Rf + beta x (E(Rm) - Rf).",
    params: [
      { name: "riskFree", label: "Risk-free rate (decimal)", kind: "number", example: 0.03 },
      { name: "beta", label: "Beta", kind: "number", example: 1.2 },
      { name: "marketReturn", label: "Expected market return (decimal)", kind: "number", example: 0.08 },
    ],
    output: "percent",
    compute: (a) => F.capmRequiredReturn(n(a, "riskFree"), n(a, "beta"), n(a, "marketReturn")).toNumber(),
  },
  {
    key: "wacc",
    label: "Weighted average cost of capital",
    description: "WACC with after-tax cost of debt.",
    params: [
      { name: "weightDebt", label: "Weight of debt", kind: "number", example: 0.4 },
      { name: "costDebtPreTax", label: "Pre-tax cost of debt", kind: "number", example: 0.06 },
      { name: "taxRate", label: "Marginal tax rate", kind: "number", example: 0.25 },
      { name: "weightPreferred", label: "Weight of preferred", kind: "number", example: 0 },
      { name: "costPreferred", label: "Cost of preferred", kind: "number", example: 0 },
      { name: "weightEquity", label: "Weight of equity", kind: "number", example: 0.6 },
      { name: "costEquity", label: "Cost of equity", kind: "number", example: 0.11 },
    ],
    output: "percent",
    compute: (a) =>
      F.wacc(
        n(a, "weightDebt"),
        n(a, "costDebtPreTax"),
        n(a, "taxRate"),
        n(a, "weightPreferred"),
        n(a, "costPreferred"),
        n(a, "weightEquity"),
        n(a, "costEquity"),
      ).toNumber(),
  },
  {
    key: "dupontROE",
    label: "DuPont ROE",
    description: "ROE = net margin x asset turnover x financial leverage.",
    params: [
      { name: "netIncome", label: "Net income", kind: "number", example: 120 },
      { name: "revenue", label: "Revenue", kind: "number", example: 1500 },
      { name: "avgAssets", label: "Average total assets", kind: "number", example: 1000 },
      { name: "avgEquity", label: "Average equity", kind: "number", example: 400 },
    ],
    output: "percent",
    compute: (a) => F.dupontROE(n(a, "netIncome"), n(a, "revenue"), n(a, "avgAssets"), n(a, "avgEquity")).roe.toNumber(),
  },
  {
    key: "currentRatio",
    label: "Current ratio",
    description: "Current assets / current liabilities.",
    params: [
      { name: "currentAssets", label: "Current assets", kind: "number", example: 500 },
      { name: "currentLiabilities", label: "Current liabilities", kind: "number", example: 250 },
    ],
    output: "ratio",
    compute: (a) => F.currentRatio(n(a, "currentAssets"), n(a, "currentLiabilities")).toNumber(),
  },
  {
    key: "quickRatio",
    label: "Quick ratio",
    description: "(Cash + marketable securities + receivables) / current liabilities.",
    params: [
      { name: "cash", label: "Cash", kind: "number", example: 80 },
      { name: "marketableSecurities", label: "Marketable securities", kind: "number", example: 40 },
      { name: "receivables", label: "Receivables", kind: "number", example: 130 },
      { name: "currentLiabilities", label: "Current liabilities", kind: "number", example: 200 },
    ],
    output: "ratio",
    compute: (a) =>
      F.quickRatio(n(a, "cash"), n(a, "marketableSecurities"), n(a, "receivables"), n(a, "currentLiabilities")).toNumber(),
  },
  {
    key: "portfolioReturn",
    label: "Portfolio expected return",
    description: "Weighted average of asset expected returns.",
    params: [
      { name: "weights", label: "Weights", kind: "list", example: [0.6, 0.4] },
      { name: "returns", label: "Expected returns (decimal)", kind: "list", example: [0.1, 0.05] },
    ],
    output: "percent",
    compute: (a) => F.portfolioReturn(list(a, "weights"), list(a, "returns")).toNumber(),
  },
  {
    key: "twoAssetStdDev",
    label: "Two-asset portfolio risk",
    description: "Standard deviation of a two-asset portfolio.",
    params: [
      { name: "w1", label: "Weight of asset 1", kind: "number", example: 0.6 },
      { name: "sd1", label: "Std. dev. asset 1 (decimal)", kind: "number", example: 0.2 },
      { name: "sd2", label: "Std. dev. asset 2 (decimal)", kind: "number", example: 0.1 },
      { name: "correlation", label: "Correlation", kind: "number", example: 0.3 },
    ],
    output: "percent",
    compute: (a) => F.twoAssetStdDev(n(a, "w1"), n(a, "sd1"), n(a, "sd2"), n(a, "correlation")).toNumber(),
  },
  {
    key: "sharpeRatio",
    label: "Sharpe ratio",
    description: "(Rp - Rf) / sigma_p.",
    params: [
      { name: "portfolioReturnValue", label: "Portfolio return (decimal)", kind: "number", example: 0.1 },
      { name: "riskFree", label: "Risk-free rate (decimal)", kind: "number", example: 0.02 },
      { name: "stdDev", label: "Portfolio std. dev. (decimal)", kind: "number", example: 0.16 },
    ],
    output: "ratio",
    compute: (a) => F.sharpeRatio(n(a, "portfolioReturnValue"), n(a, "riskFree"), n(a, "stdDev")).toNumber(),
  },
  {
    key: "sampleStdDev",
    label: "Sample standard deviation",
    description: "Standard deviation using the n - 1 denominator.",
    params: [{ name: "values", label: "Observations", kind: "list", example: [0.05, 0.1, -0.02, 0.07] }],
    output: "number",
    compute: (a) => F.sampleStdDev(list(a, "values")).toNumber(),
  },
  {
    key: "expectedValue",
    label: "Expected value",
    description: "Probability-weighted average of outcomes.",
    params: [
      { name: "probabilities", label: "Probabilities", kind: "list", example: [0.3, 0.5, 0.2] },
      { name: "outcomes", label: "Outcomes", kind: "list", example: [0.15, 0.08, -0.05] },
    ],
    output: "number",
    compute: (a) => F.expectedValue(list(a, "probabilities"), list(a, "outcomes")).toNumber(),
  },
  {
    key: "parametricVaR",
    label: "Parametric VaR",
    description: "Delta-normal VaR = (z x sigma x sqrt(T) - mu x T) x value.",
    params: [
      { name: "value", label: "Position value", kind: "number", example: 1000000 },
      { name: "sigmaPerPeriod", label: "Volatility per period (decimal)", kind: "number", example: 0.02 },
      { name: "confidence", label: "Confidence (0.95 or 0.99)", kind: "number", example: 0.95 },
      { name: "periods", label: "Horizon (periods)", kind: "number", example: 1 },
      { name: "meanPerPeriod", label: "Mean return per period (decimal)", kind: "number", example: 0 },
    ],
    output: "money",
    compute: (a) =>
      F.parametricVaR(
        n(a, "value"),
        n(a, "sigmaPerPeriod"),
        n(a, "confidence"),
        (a.periods as number) ?? 1,
        (a.meanPerPeriod as number) ?? 0,
      ).toNumber(),
  },
  {
    key: "forwardPrice",
    label: "Forward price",
    description: "F0 = S0 x (1 + r)^T, no income, annual compounding.",
    params: [
      { name: "spot", label: "Spot price", kind: "number", example: 100 },
      { name: "riskFree", label: "Risk-free rate (decimal)", kind: "number", example: 0.04 },
      { name: "years", label: "Time to expiry (years)", kind: "number", example: 0.5 },
    ],
    output: "money",
    compute: (a) => F.forwardPrice(n(a, "spot"), n(a, "riskFree"), n(a, "years")).toNumber(),
  },
  {
    key: "putFromParity",
    label: "Put from put-call parity",
    description: "p0 = c0 - S0 + X / (1 + r)^T (European, no dividends).",
    params: [
      { name: "call", label: "Call price", kind: "number", example: 6 },
      { name: "spot", label: "Spot price", kind: "number", example: 50 },
      { name: "strike", label: "Strike price", kind: "number", example: 50 },
      { name: "riskFree", label: "Risk-free rate (decimal)", kind: "number", example: 0.05 },
      { name: "years", label: "Time to expiry (years)", kind: "number", example: 1 },
    ],
    output: "money",
    compute: (a) => F.putFromParity(n(a, "call"), n(a, "spot"), n(a, "strike"), n(a, "riskFree"), n(a, "years")).toNumber(),
  },
  {
    key: "straightLineDepreciation",
    label: "Straight-line depreciation",
    description: "(Cost - salvage) / useful life.",
    params: [
      { name: "cost", label: "Cost", kind: "number", example: 50000 },
      { name: "salvage", label: "Salvage value", kind: "number", example: 5000 },
      { name: "usefulLife", label: "Useful life (years)", kind: "number", example: 5 },
    ],
    output: "money",
    compute: (a) => F.straightLineDepreciation(n(a, "cost"), n(a, "salvage"), n(a, "usefulLife")).toNumber(),
  },
  {
    key: "doubleDecliningDepreciation",
    label: "Double-declining-balance depreciation",
    description: "DDB charge for a given year, never depreciating below salvage.",
    params: [
      { name: "cost", label: "Cost", kind: "number", example: 50000 },
      { name: "salvage", label: "Salvage value", kind: "number", example: 5000 },
      { name: "usefulLife", label: "Useful life (years)", kind: "number", example: 5 },
      { name: "year", label: "Year", kind: "number", example: 2 },
    ],
    output: "money",
    compute: (a) =>
      F.doubleDecliningDepreciation(n(a, "cost"), n(a, "salvage"), n(a, "usefulLife"), n(a, "year")).toNumber(),
  },
];

export const calculatorMap: Record<string, Calculator> = Object.fromEntries(calculators.map((c) => [c.key, c]));

export function runCalculator(key: string, args: Record<string, number | number[]>): number {
  const calc = calculatorMap[key];
  if (!calc) throw new F.FinanceInputError(`Unknown calculator: ${key}`);
  return calc.compute(args);
}

export function formatOutput(value: number, format: OutputFormat): string {
  switch (format) {
    case "money":
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "percent":
      return `${(value * 100).toFixed(4)}%`;
    case "years":
      return `${value.toFixed(4)} years`;
    case "ratio":
      return value.toFixed(4);
    default:
      return value.toFixed(6);
  }
}
