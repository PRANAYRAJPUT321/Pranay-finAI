/**
 * Deterministic, decimal-safe financial calculations.
 *
 * These functions are the source of truth for numerical answers: question
 * answer keys are validated against them (see question calcSpec), the formula
 * library calculators use them, and the AI tutor calls them as tools instead of
 * letting a language model do arithmetic.
 *
 * Conventions:
 *  - Rates are decimals per period (0.05 = 5%), unless a parameter says otherwise.
 *  - Cash-flow sign convention for TVM follows the "investor" view used by most
 *    exam calculators: pv and pmt are treated as amounts invested/received
 *    without sign flipping; results are positive magnitudes.
 */
import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Num = number | string | Decimal;
const D = (x: Num) => new Decimal(x);

export class FinanceInputError extends Error {}

function assertFinite(name: string, value: Num) {
  const d = D(value);
  if (!d.isFinite()) throw new FinanceInputError(`${name} must be a finite number`);
  return d;
}

export function round(value: Num, decimals = 2): number {
  return D(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
}

// ---------------------------------------------------------------------------
// Time value of money
// ---------------------------------------------------------------------------

/** Future value of a lump sum plus an ordinary annuity (type 0) or annuity due (type 1). */
export function futureValue(pv: Num, rate: Num, periods: Num, pmt: Num = 0, type: 0 | 1 = 0): Decimal {
  const r = assertFinite("rate", rate);
  const n = assertFinite("periods", periods);
  const growth = r.plus(1).pow(n);
  const lump = D(pv).times(growth);
  if (D(pmt).isZero()) return lump;
  const annuity = r.isZero()
    ? D(pmt).times(n)
    : D(pmt).times(growth.minus(1).div(r)).times(type === 1 ? r.plus(1) : 1);
  return lump.plus(annuity);
}

/** Present value of a future lump sum plus an annuity. */
export function presentValue(fv: Num, rate: Num, periods: Num, pmt: Num = 0, type: 0 | 1 = 0): Decimal {
  const r = assertFinite("rate", rate);
  const n = assertFinite("periods", periods);
  const discount = r.plus(1).pow(n);
  const lump = D(fv).div(discount);
  if (D(pmt).isZero()) return lump;
  const annuity = r.isZero()
    ? D(pmt).times(n)
    : D(pmt).times(D(1).minus(D(1).div(discount)).div(r)).times(type === 1 ? r.plus(1) : 1);
  return lump.plus(annuity);
}

/** Level payment that amortises a present value over n periods (ordinary annuity). */
export function annuityPayment(pv: Num, rate: Num, periods: Num): Decimal {
  const r = assertFinite("rate", rate);
  const n = assertFinite("periods", periods);
  if (n.lte(0)) throw new FinanceInputError("periods must be positive");
  if (r.isZero()) return D(pv).div(n);
  return D(pv).times(r).div(D(1).minus(r.plus(1).pow(n.neg())));
}

/** Effective annual rate from a stated annual rate compounded m times a year. */
export function effectiveAnnualRate(statedRate: Num, periodsPerYear: Num): Decimal {
  const m = assertFinite("periodsPerYear", periodsPerYear);
  if (m.lte(0)) throw new FinanceInputError("periodsPerYear must be positive");
  return D(1).plus(D(statedRate).div(m)).pow(m).minus(1);
}

/** Effective annual rate under continuous compounding. */
export function continuousEAR(statedRate: Num): Decimal {
  return D(statedRate).exp().minus(1);
}

/** Net present value; cashFlows[0] occurs at t=0. */
export function npv(rate: Num, cashFlows: Num[]): Decimal {
  const r = assertFinite("rate", rate);
  if (r.lte(-1)) throw new FinanceInputError("rate must be greater than -100%");
  return cashFlows.reduce<Decimal>((acc, cf, t) => acc.plus(D(cf).div(r.plus(1).pow(t))), D(0));
}

/**
 * Internal rate of return via bisection on a bracketing interval. Bisection is
 * slower than Newton's method but cannot diverge, which matters more here.
 */
export function irr(cashFlows: Num[], low = -0.99, high = 10, tolerance = 1e-12): Decimal {
  if (cashFlows.length < 2) throw new FinanceInputError("IRR needs at least two cash flows");
  const hasPos = cashFlows.some((c) => D(c).gt(0));
  const hasNeg = cashFlows.some((c) => D(c).lt(0));
  if (!hasPos || !hasNeg) throw new FinanceInputError("IRR needs both positive and negative cash flows");
  let lo = D(low);
  let hi = D(high);
  let fLo = npv(lo, cashFlows);
  const fHi = npv(hi, cashFlows);
  if (fLo.times(fHi).gt(0)) throw new FinanceInputError("IRR not bracketed in the search interval");
  for (let i = 0; i < 300; i++) {
    const mid = lo.plus(hi).div(2);
    const fMid = npv(mid, cashFlows);
    if (fMid.abs().lt(tolerance) || hi.minus(lo).abs().lt(tolerance)) return mid;
    if (fLo.times(fMid).lt(0)) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return lo.plus(hi).div(2);
}

/** Holding period return including income. */
export function holdingPeriodReturn(beginPrice: Num, endPrice: Num, income: Num = 0): Decimal {
  const p0 = D(beginPrice);
  if (p0.isZero()) throw new FinanceInputError("beginPrice cannot be zero");
  return D(endPrice).minus(p0).plus(income).div(p0);
}

// ---------------------------------------------------------------------------
// Fixed income
// ---------------------------------------------------------------------------

export interface BondInput {
  face: Num;
  couponRate: Num; // annual coupon rate
  ytm: Num; // annual yield to maturity (stated, compounded at `frequency`)
  years: Num; // whole coupon periods assumed (years * frequency must be an integer)
  frequency?: number; // coupons per year
}

function bondPeriods(years: Num, frequency: number) {
  const n = D(years).times(frequency);
  if (!n.isInteger() || n.lte(0)) {
    throw new FinanceInputError("years x frequency must be a positive whole number of periods");
  }
  return n.toNumber();
}

/** Price of an option-free bond on a coupon date. */
export function bondPrice({ face, couponRate, ytm, years, frequency = 1 }: BondInput): Decimal {
  const n = bondPeriods(years, frequency);
  const coupon = D(face).times(couponRate).div(frequency);
  const r = D(ytm).div(frequency);
  return presentValue(face, r, n, coupon);
}

/** Yield to maturity (annualised, stated) that equates price with discounted cash flows. */
export function bondYield(price: Num, face: Num, couponRate: Num, years: Num, frequency = 1): Decimal {
  const n = bondPeriods(years, frequency);
  const coupon = D(face).times(couponRate).div(frequency);
  const flows: Decimal[] = [D(price).neg()];
  for (let t = 1; t <= n; t++) flows.push(t === n ? coupon.plus(face) : coupon);
  return irr(flows, -0.99, 5).times(frequency);
}

/** Macaulay duration in years. */
export function macaulayDuration(input: BondInput): Decimal {
  const frequency = input.frequency ?? 1;
  const n = bondPeriods(input.years, frequency);
  const coupon = D(input.face).times(input.couponRate).div(frequency);
  const r = D(input.ytm).div(frequency);
  let weighted = D(0);
  let price = D(0);
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? coupon.plus(input.face) : coupon;
    const pv = cf.div(r.plus(1).pow(t));
    weighted = weighted.plus(pv.times(t));
    price = price.plus(pv);
  }
  return weighted.div(price).div(frequency);
}

/** Modified duration in years. */
export function modifiedDuration(input: BondInput): Decimal {
  const frequency = input.frequency ?? 1;
  return macaulayDuration(input).div(D(1).plus(D(input.ytm).div(frequency)));
}

export function currentYield(annualCoupon: Num, price: Num): Decimal {
  return D(annualCoupon).div(price);
}

/** Approximate percentage price change from duration and (optional) convexity. */
export function durationPriceChange(modDuration: Num, yieldChange: Num, convexity: Num = 0): Decimal {
  const dy = D(yieldChange);
  return D(modDuration).neg().times(dy).plus(D(0.5).times(convexity).times(dy.pow(2)));
}

// ---------------------------------------------------------------------------
// Equity and corporate finance
// ---------------------------------------------------------------------------

/** Gordon (constant) growth model. Pass the dividend just paid (D0); D1 = D0 x (1+g). */
export function gordonGrowthValue(d0: Num, requiredReturn: Num, growth: Num): Decimal {
  const r = D(requiredReturn);
  const g = D(growth);
  if (r.lte(g)) throw new FinanceInputError("required return must exceed the growth rate");
  return D(d0).times(g.plus(1)).div(r.minus(g));
}

export function capmRequiredReturn(riskFree: Num, beta: Num, marketReturn: Num): Decimal {
  return D(riskFree).plus(D(beta).times(D(marketReturn).minus(riskFree)));
}

export function wacc(
  weightDebt: Num,
  costDebtPreTax: Num,
  taxRate: Num,
  weightPreferred: Num,
  costPreferred: Num,
  weightEquity: Num,
  costEquity: Num,
): Decimal {
  const total = D(weightDebt).plus(weightPreferred).plus(weightEquity);
  if (total.minus(1).abs().gt(1e-9)) throw new FinanceInputError("capital weights must sum to 1");
  return D(weightDebt)
    .times(costDebtPreTax)
    .times(D(1).minus(taxRate))
    .plus(D(weightPreferred).times(costPreferred))
    .plus(D(weightEquity).times(costEquity));
}

/** DuPont three-factor ROE. */
export function dupontROE(netIncome: Num, revenue: Num, avgAssets: Num, avgEquity: Num) {
  const margin = D(netIncome).div(revenue);
  const turnover = D(revenue).div(avgAssets);
  const leverage = D(avgAssets).div(avgEquity);
  return { margin, turnover, leverage, roe: margin.times(turnover).times(leverage) };
}

export function currentRatio(currentAssets: Num, currentLiabilities: Num): Decimal {
  return D(currentAssets).div(currentLiabilities);
}

export function quickRatio(cash: Num, marketableSecurities: Num, receivables: Num, currentLiabilities: Num): Decimal {
  return D(cash).plus(marketableSecurities).plus(receivables).div(currentLiabilities);
}

// ---------------------------------------------------------------------------
// Portfolio and statistics
// ---------------------------------------------------------------------------

export function portfolioReturn(weights: Num[], returns: Num[]): Decimal {
  if (weights.length !== returns.length) throw new FinanceInputError("weights and returns must align");
  return weights.reduce<Decimal>((acc, w, i) => acc.plus(D(w).times(returns[i])), D(0));
}

/** Standard deviation of a two-asset portfolio. */
export function twoAssetStdDev(w1: Num, sd1: Num, sd2: Num, correlation: Num): Decimal {
  const a = D(w1);
  const b = D(1).minus(a);
  const variance = a
    .pow(2)
    .times(D(sd1).pow(2))
    .plus(b.pow(2).times(D(sd2).pow(2)))
    .plus(D(2).times(a).times(b).times(correlation).times(sd1).times(sd2));
  return variance.sqrt();
}

export function sharpeRatio(portfolioReturnValue: Num, riskFree: Num, stdDev: Num): Decimal {
  return D(portfolioReturnValue).minus(riskFree).div(stdDev);
}

export function mean(values: Num[]): Decimal {
  if (values.length === 0) throw new FinanceInputError("need at least one value");
  return values.reduce<Decimal>((a, v) => a.plus(v), D(0)).div(values.length);
}

/** Sample variance (n - 1 denominator). */
export function sampleVariance(values: Num[]): Decimal {
  if (values.length < 2) throw new FinanceInputError("need at least two values");
  const m = mean(values);
  return values.reduce<Decimal>((a, v) => a.plus(D(v).minus(m).pow(2)), D(0)).div(values.length - 1);
}

export function sampleStdDev(values: Num[]): Decimal {
  return sampleVariance(values).sqrt();
}

export function expectedValue(probabilities: Num[], outcomes: Num[]): Decimal {
  const total = probabilities.reduce<Decimal>((a, p) => a.plus(p), D(0));
  if (total.minus(1).abs().gt(1e-9)) throw new FinanceInputError("probabilities must sum to 1");
  return probabilities.reduce<Decimal>((a, p, i) => a.plus(D(p).times(outcomes[i])), D(0));
}

// ---------------------------------------------------------------------------
// Risk
// ---------------------------------------------------------------------------

/** Standard normal quantiles for the confidence levels used in exam questions. */
const Z_ONE_TAILED: Record<string, number> = { "0.9": 1.282, "0.95": 1.645, "0.975": 1.96, "0.99": 2.326 };

export function zScore(confidence: Num): number {
  const z = Z_ONE_TAILED[D(confidence).toString()];
  if (z === undefined) throw new FinanceInputError("supported confidence levels: 0.90, 0.95, 0.975, 0.99");
  return z;
}

/**
 * Parametric (delta-normal) VaR for a position: VaR = (z x sigma - mu) x value,
 * scaled to the horizon with the square-root-of-time rule (assumes i.i.d. returns).
 */
export function parametricVaR(value: Num, sigmaPerPeriod: Num, confidence: Num, periods: Num = 1, meanPerPeriod: Num = 0): Decimal {
  const z = zScore(confidence);
  const t = D(periods);
  return D(z).times(sigmaPerPeriod).times(t.sqrt()).minus(D(meanPerPeriod).times(t)).times(value);
}

// ---------------------------------------------------------------------------
// Derivatives
// ---------------------------------------------------------------------------

/** No-arbitrage forward price with annual compounding and no income. */
export function forwardPrice(spot: Num, riskFree: Num, years: Num): Decimal {
  return D(spot).times(D(1).plus(riskFree).pow(years));
}

/** Put price implied by put-call parity (European, no dividends, annual compounding). */
export function putFromParity(call: Num, spot: Num, strike: Num, riskFree: Num, years: Num): Decimal {
  return D(call).minus(spot).plus(D(strike).div(D(1).plus(riskFree).pow(years)));
}

// ---------------------------------------------------------------------------
// Accounting and taxation
// ---------------------------------------------------------------------------

export function straightLineDepreciation(cost: Num, salvage: Num, usefulLife: Num): Decimal {
  return D(cost).minus(salvage).div(usefulLife);
}

/** Double-declining-balance depreciation for a given year (1-based), never below salvage. */
export function doubleDecliningDepreciation(cost: Num, salvage: Num, usefulLife: Num, year: number): Decimal {
  const rate = D(2).div(usefulLife);
  let book = D(cost);
  let charge = D(0);
  for (let y = 1; y <= year; y++) {
    charge = Decimal.min(book.times(rate), Decimal.max(book.minus(salvage), 0));
    book = book.minus(charge);
  }
  return charge;
}

export interface TaxBracket {
  upTo: number | null; // upper bound of the bracket; null = no upper bound
  rate: number;
}

/**
 * Progressive tax on taxable income for a supplied bracket schedule. Brackets are
 * jurisdiction- and year-specific, so callers must pass the schedule explicitly;
 * this function deliberately has no built-in tax tables.
 */
export function progressiveTax(taxableIncome: Num, brackets: TaxBracket[]): Decimal {
  let remaining = D(taxableIncome);
  let lower = D(0);
  let tax = D(0);
  for (const b of brackets) {
    if (remaining.lte(0)) break;
    const width = b.upTo === null ? remaining : Decimal.min(remaining, D(b.upTo).minus(lower));
    tax = tax.plus(width.times(b.rate));
    remaining = remaining.minus(width);
    if (b.upTo !== null) lower = D(b.upTo);
  }
  return tax;
}
