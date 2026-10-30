import { describe, expect, it } from "vitest";
import * as F from "@/lib/finance/core";
import { calculators, runCalculator } from "@/lib/finance/registry";

const r = (d: { toNumber(): number }, dp = 2) => F.round(d.toNumber(), dp);

describe("time value of money", () => {
  it("future value of a lump sum", () => expect(r(F.futureValue(1000, 0.05, 10))).toBe(1628.89));
  it("present value of a lump sum", () => expect(r(F.presentValue(1000, 0.06, 5))).toBe(747.26));
  it("ordinary annuity vs annuity due", () => {
    expect(r(F.presentValue(0, 0.05, 5, 1000))).toBe(4329.48);
    expect(r(F.presentValue(0, 0.05, 5, 1000, 1))).toBe(4545.95);
    expect(r(F.futureValue(0, 0.05, 5, 1000))).toBe(5525.63);
  });
  it("zero-rate annuities", () => {
    expect(r(F.futureValue(0, 0, 4, 100))).toBe(400);
    expect(r(F.annuityPayment(1200, 0, 12))).toBe(100);
  });
  it("mortgage payment", () => expect(r(F.annuityPayment(200000, 0.005, 360))).toBe(1199.1));
  it("effective annual rate", () => {
    expect(r(F.effectiveAnnualRate(0.12, 12), 6)).toBe(0.126825);
    expect(r(F.continuousEAR(0.1), 6)).toBe(0.105171);
  });
  it("NPV and IRR are consistent", () => {
    const flows = [-1000, 300, 400, 500];
    expect(r(F.npv(0.1, flows))).toBe(-21.04);
    const irr = F.irr(flows);
    expect(r(irr, 4)).toBe(0.0890);
    expect(Math.abs(F.npv(irr, flows).toNumber())).toBeLessThan(1e-6);
  });
  it("IRR rejects cash flows without a sign change", () => {
    expect(() => F.irr([100, 200])).toThrow(F.FinanceInputError);
  });
  it("holding period return", () => expect(r(F.holdingPeriodReturn(50, 54, 1), 4)).toBe(0.1));
});

describe("fixed income", () => {
  it("prices a semi-annual premium bond", () => {
    expect(r(F.bondPrice({ face: 1000, couponRate: 0.06, ytm: 0.05, years: 5, frequency: 2 }))).toBe(1043.76);
  });
  it("prices at par when coupon equals yield", () => {
    expect(r(F.bondPrice({ face: 1000, couponRate: 0.05, ytm: 0.05, years: 10, frequency: 1 }))).toBe(1000);
  });
  it("recovers yield from price", () => {
    const price = F.bondPrice({ face: 1000, couponRate: 0.04, ytm: 0.055, years: 7, frequency: 2 });
    expect(r(F.bondYield(price, 1000, 0.04, 7, 2), 6)).toBe(0.055);
  });
  it("duration measures", () => {
    const bond = { face: 100, couponRate: 0.05, ytm: 0.05, years: 3, frequency: 1 };
    expect(r(F.macaulayDuration(bond), 4)).toBe(2.8594);
    expect(r(F.modifiedDuration(bond), 4)).toBe(2.7232);
    expect(r(F.durationPriceChange(7.2, 0.005), 4)).toBe(-0.036);
  });
  it("rejects fractional coupon periods", () => {
    expect(() => F.bondPrice({ face: 100, couponRate: 0.05, ytm: 0.05, years: 2.3, frequency: 1 })).toThrow();
  });
});

describe("equity, corporate finance, portfolio, risk, derivatives", () => {
  it("Gordon growth", () => expect(r(F.gordonGrowthValue(2, 0.1, 0.04))).toBe(34.67));
  it("Gordon growth requires r > g", () => expect(() => F.gordonGrowthValue(2, 0.04, 0.05)).toThrow());
  it("CAPM", () => expect(r(F.capmRequiredReturn(0.03, 1.2, 0.08), 4)).toBe(0.09));
  it("WACC", () => expect(r(F.wacc(0.4, 0.06, 0.25, 0, 0, 0.6, 0.11), 4)).toBe(0.084));
  it("WACC weights must sum to 1", () => expect(() => F.wacc(0.5, 0.06, 0.25, 0, 0, 0.6, 0.11)).toThrow());
  it("DuPont", () => expect(r(F.dupontROE(120, 1500, 1000, 400).roe, 4)).toBe(0.3));
  it("two-asset portfolio risk", () => expect(r(F.twoAssetStdDev(0.6, 0.2, 0.1, 0.3), 6)).toBe(0.137405));
  it("sample standard deviation", () => expect(r(F.sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9]), 4)).toBe(2.1381));
  it("expected value", () => expect(r(F.expectedValue([0.3, 0.5, 0.2], [0.15, 0.08, -0.05]), 4)).toBe(0.075));
  it("parametric VaR", () => {
    expect(r(F.parametricVaR(1_000_000, 0.02, 0.95))).toBe(32900);
    expect(r(F.parametricVaR(1_000_000, 0.01, 0.99, 10))).toBe(73554.58);
  });
  it("forward price and put-call parity", () => {
    expect(r(F.forwardPrice(100, 0.04, 0.5))).toBe(101.98);
    expect(r(F.putFromParity(6, 50, 50, 0.05, 1), 3)).toBe(3.619);
  });
});

describe("accounting and tax", () => {
  it("depreciation methods", () => {
    expect(r(F.straightLineDepreciation(50000, 5000, 5))).toBe(9000);
    expect(r(F.doubleDecliningDepreciation(50000, 5000, 5, 1))).toBe(20000);
    expect(r(F.doubleDecliningDepreciation(50000, 5000, 5, 2))).toBe(12000);
    // Year 5 is limited so book value never drops below salvage.
    expect(r(F.doubleDecliningDepreciation(50000, 5000, 5, 5))).toBe(1480);
  });
  it("progressive tax uses the supplied schedule", () => {
    const brackets = [
      { upTo: 10000, rate: 0 },
      { upTo: 40000, rate: 0.1 },
      { upTo: null, rate: 0.2 },
    ];
    expect(r(F.progressiveTax(50000, brackets))).toBe(5000);
    expect(r(F.progressiveTax(8000, brackets))).toBe(0);
  });
});

describe("interest, cost accounting, economics and alternatives", () => {
  it("simple interest and annuity-due future value", () => {
    expect(r(F.simpleInterest(50000, 0.08, 3))).toBe(12000);
    // 12 monthly SIP payments of 5,000 at 1% a month, paid at the start of each month.
    expect(r(F.futureValueAnnuityDue(5000, 0.01, 12))).toBe(64046.64);
  });
  it("break-even and contribution margin", () => {
    expect(r(F.breakEvenUnits(120000, 50, 30))).toBe(6000);
    expect(r(F.contributionMarginRatio(50, 30), 4)).toBe(0.4);
    expect(() => F.breakEvenUnits(1000, 10, 12)).toThrow();
  });
  it("arc elasticity is signed and uses midpoints", () => {
    expect(r(F.arcElasticity(100, 80, 10, 12), 4)).toBe(-1.2222);
  });
  it("inventory turnover uses average inventory", () => {
    expect(r(F.inventoryTurnover(600000, 90000, 110000), 2)).toBe(6);
  });
  it("hedge fund net returns under soft and hard hurdles", () => {
    expect(r(F.hedgeFundNetReturn(0.15, 0.02, 0.2), 4)).toBe(0.104);
    expect(r(F.hedgeFundNetReturn(0.15, 0.02, 0.2, 0.05, 0), 4)).toBe(0.104);
    expect(r(F.hedgeFundNetReturn(0.15, 0.02, 0.2, 0.05, 1), 4)).toBe(0.114);
    // Below the hurdle no incentive fee is charged.
    expect(r(F.hedgeFundNetReturn(0.06, 0.02, 0.2, 0.05, 0), 4)).toBe(0.04);
  });
});

describe("calculator registry", () => {
  it("every calculator runs on its documented example inputs", () => {
    for (const c of calculators) {
      const args = Object.fromEntries(c.params.map((p) => [p.name, p.example]));
      const value = runCalculator(c.key, args);
      expect(Number.isFinite(value), c.key).toBe(true);
    }
  });
  it("rejects unknown calculators and bad input", () => {
    expect(() => runCalculator("nope", {})).toThrow();
    expect(() => runCalculator("npv", { rate: 0.1, cashFlows: 5 as unknown as number[] })).toThrow();
  });
});
