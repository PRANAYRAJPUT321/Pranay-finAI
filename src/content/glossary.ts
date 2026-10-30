/**
 * PD FinPrep glossary: original, plain-English definitions of key terms used
 * across the certifications we cover. Program tags say where a term is most
 * commonly examined; definitions are general and jurisdiction-neutral unless
 * they say otherwise.
 */

export type GlossaryCategory =
  | "Accounting"
  | "Audit"
  | "Corporate finance"
  | "Economics"
  | "Quantitative methods"
  | "Fixed income"
  | "Equity and portfolio"
  | "Derivatives"
  | "Risk management"
  | "Alternative investments"
  | "Personal finance"
  | "Ethics and regulation"
  | "Law";

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: GlossaryCategory;
  programs: string[]; // ExamProgram slugs
  formula?: string;
  related?: string[];
}

const ALL_INVEST = ["cfa", "frm", "caia", "cfp"];

export const GLOSSARY: GlossaryTerm[] = [
  // Accounting
  { term: "Accrual basis", definition: "Recording revenues when earned and expenses when incurred, regardless of when cash moves.", category: "Accounting", programs: ["cpa-us", "acca", "ca-india", "cfa"], related: ["Matching principle"] },
  { term: "Accounting equation", definition: "Assets always equal liabilities plus equity (capital); every transaction keeps it in balance.", category: "Accounting", programs: ["ca-india", "acca", "cpa-us"], formula: "Assets = Liabilities + Equity" },
  { term: "Matching principle", definition: "Expenses are recognised in the same period as the revenues they help generate.", category: "Accounting", programs: ["cpa-us", "acca", "ca-india"] },
  { term: "Going concern", definition: "The assumption that an entity will continue operating for the foreseeable future; if doubtful, it must be disclosed and may change the basis of preparation.", category: "Accounting", programs: ["acca", "cpa-us", "ca-india"] },
  { term: "Materiality", definition: "Information is material if omitting or misstating it could reasonably influence users' decisions.", category: "Accounting", programs: ["acca", "cpa-us", "cfa"] },
  { term: "Depreciation", definition: "Systematic allocation of a tangible asset's depreciable amount (cost less residual value) over its useful life.", category: "Accounting", programs: ["cpa-us", "acca", "ca-india", "cfa"], related: ["Written-down value (WDV)", "Straight-line method"] },
  { term: "Straight-line method", definition: "Depreciation of an equal amount each year.", category: "Accounting", programs: ["cpa-us", "acca", "ca-india", "cfa"], formula: "(Cost − Residual value) / Useful life" },
  { term: "Written-down value (WDV)", definition: "Depreciation charged as a fixed percentage of the asset's opening book value each year (also called reducing balance).", category: "Accounting", programs: ["ca-india", "acca"] },
  { term: "Amortisation", definition: "Systematic allocation of an intangible asset's cost (or a bond discount/premium) over its useful life or term.", category: "Accounting", programs: ["cpa-us", "acca", "cfa"] },
  { term: "Impairment", definition: "A write-down when an asset's carrying amount exceeds its recoverable amount (IFRS) or fair value after a recoverability test (US GAAP).", category: "Accounting", programs: ["acca", "cpa-us", "cfa"] },
  { term: "Net realisable value (NRV)", definition: "Estimated selling price less costs to complete and sell; inventory is written down when NRV falls below cost.", category: "Accounting", programs: ["acca", "cpa-us", "ca-india"] },
  { term: "FIFO", definition: "First-in, first-out inventory method: the oldest costs are assigned to cost of goods sold first.", category: "Accounting", programs: ["cpa-us", "acca", "cfa", "ca-india"], related: ["LIFO", "Weighted average cost"] },
  { term: "LIFO", definition: "Last-in, first-out inventory method: the newest costs go to cost of goods sold first. Permitted under US GAAP, prohibited under IFRS.", category: "Accounting", programs: ["cpa-us", "cfa"] },
  { term: "Weighted average cost", definition: "Inventory cost per unit equal to total cost of goods available divided by units available.", category: "Accounting", programs: ["cpa-us", "acca", "cfa", "ca-india"] },
  { term: "Revenue recognition (five steps)", definition: "IFRS 15 / ASC 606 model: identify contract, identify performance obligations, determine price, allocate price, recognise revenue when obligations are satisfied.", category: "Accounting", programs: ["cpa-us", "acca", "cfa"] },
  { term: "Performance obligation", definition: "A promise to transfer a distinct good or service to a customer; the unit of account for revenue recognition.", category: "Accounting", programs: ["cpa-us", "acca"] },
  { term: "Contract liability", definition: "An obligation to transfer goods or services for which the entity has already received payment (deferred or unearned revenue).", category: "Accounting", programs: ["cpa-us", "acca"] },
  { term: "Provision", definition: "A liability of uncertain timing or amount, recognised when there is a present obligation, a probable outflow and a reliable estimate (IAS 37).", category: "Accounting", programs: ["acca", "ca-india"] },
  { term: "Contingent liability", definition: "A possible obligation, or a present obligation that is not probable or cannot be measured reliably; disclosed rather than recognised unless remote.", category: "Accounting", programs: ["acca", "cpa-us", "ca-india"] },
  { term: "Right-of-use asset", definition: "A lessee's asset representing its right to use a leased item over the lease term (IFRS 16 / ASC 842).", category: "Accounting", programs: ["acca", "cpa-us", "cfa"] },
  { term: "Goodwill", definition: "The excess of the consideration (plus non-controlling interest) over the fair value of an acquiree's identifiable net assets; tested for impairment, not amortised under IFRS.", category: "Accounting", programs: ["acca", "cpa-us", "cfa"], formula: "Consideration + NCI − Fair value of net assets" },
  { term: "Non-controlling interest (NCI)", definition: "The equity in a subsidiary not attributable to the parent.", category: "Accounting", programs: ["acca", "cpa-us"] },
  { term: "Consolidation", definition: "Combining a parent and its subsidiaries' financial statements as a single economic entity, eliminating intra-group balances and transactions.", category: "Accounting", programs: ["acca", "cpa-us", "ca-india"] },
  { term: "Other comprehensive income (OCI)", definition: "Gains and losses recognised outside profit or loss, such as revaluation surpluses and certain foreign-currency translation differences.", category: "Accounting", programs: ["acca", "cpa-us", "cfa"] },
  { term: "Working capital", definition: "Current assets minus current liabilities; a measure of short-term liquidity.", category: "Accounting", programs: ["acca", "cfa", "cma-us", "ca-india"] },
  { term: "Bank reconciliation", definition: "A statement explaining differences between the cash book and the bank statement, usually timing items such as unpresented cheques.", category: "Accounting", programs: ["ca-india", "acca"] },
  { term: "Absorption costing", definition: "Product costing that includes both variable and fixed manufacturing overhead in inventory.", category: "Accounting", programs: ["cma-us", "acca"], related: ["Variable costing"] },
  { term: "Variable costing", definition: "Product costing that includes only variable manufacturing costs in inventory; fixed overhead is expensed as incurred.", category: "Accounting", programs: ["cma-us", "acca"] },
  { term: "Activity-based costing (ABC)", definition: "Assigning overhead to products through activities and multiple cost drivers rather than a single volume-based rate.", category: "Accounting", programs: ["cma-us", "acca"] },
  { term: "Standard cost", definition: "A predetermined cost per unit used for budgeting and to measure variances.", category: "Accounting", programs: ["cma-us", "acca", "ca-india"] },
  { term: "Variance", definition: "The difference between an actual result and a standard or budget; unfavourable if it reduces profit.", category: "Accounting", programs: ["cma-us", "acca"] },
  { term: "Flexible budget", definition: "A budget adjusted to the actual level of activity, used to separate volume effects from efficiency and price effects.", category: "Accounting", programs: ["cma-us", "acca"] },

  // Audit
  { term: "Audit risk", definition: "The risk that the auditor expresses an inappropriate opinion when financial statements are materially misstated.", category: "Audit", programs: ["cpa-us", "acca", "ca-india"], formula: "AR = IR × CR × DR" },
  { term: "Inherent risk", definition: "Susceptibility of an assertion to material misstatement before considering controls.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Control risk", definition: "The risk that internal controls fail to prevent or detect a material misstatement.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Detection risk", definition: "The risk that the auditor's procedures fail to detect a material misstatement; the only audit-risk component the auditor controls.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Assertions", definition: "Management's implicit claims in the financial statements, such as existence, completeness, accuracy, valuation, cut-off, rights and obligations, and presentation.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Substantive procedures", definition: "Audit procedures designed to detect material misstatements at the assertion level: tests of details and substantive analytical procedures.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Qualified opinion", definition: "An audit opinion stating the statements are fairly presented except for a material but not pervasive matter.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Adverse opinion", definition: "An audit opinion that the statements are not fairly presented because of a material and pervasive misstatement.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Disclaimer of opinion", definition: "The auditor does not express an opinion because it could not obtain sufficient appropriate evidence and possible effects are material and pervasive.", category: "Audit", programs: ["cpa-us", "acca"] },
  { term: "Segregation of duties", definition: "Separating authorisation, record-keeping and custody of assets so no single person can commit and conceal an error or fraud.", category: "Audit", programs: ["cpa-us", "cma-us", "acca"] },
  { term: "COSO framework", definition: "Internal-control framework with five components: control environment, risk assessment, control activities, information and communication, monitoring activities.", category: "Audit", programs: ["cma-us", "cpa-us"] },

  // Corporate finance
  { term: "Net present value (NPV)", definition: "Present value of future cash flows minus the initial investment; accept projects with positive NPV.", category: "Corporate finance", programs: ["cfa", "cma-us", "acca", "frm"], formula: "NPV = Σ CF_t / (1 + r)^t − I₀" },
  { term: "Internal rate of return (IRR)", definition: "The discount rate that makes a project's NPV zero.", category: "Corporate finance", programs: ["cfa", "cma-us", "acca", "caia"] },
  { term: "Payback period", definition: "Time needed to recover an investment from undiscounted cash flows; ignores the time value of money and later cash flows.", category: "Corporate finance", programs: ["cma-us", "acca", "cfa"] },
  { term: "WACC", definition: "Weighted average cost of capital: the blended required return of debt, preferred and equity investors, using the after-tax cost of debt.", category: "Corporate finance", programs: ["cfa", "cma-us", "acca"], formula: "w_d × k_d(1 − t) + w_p × k_p + w_e × k_e" },
  { term: "Break-even point", definition: "Sales volume at which total contribution equals fixed costs, so profit is zero.", category: "Corporate finance", programs: ["cma-us", "acca"], formula: "Fixed costs / (Price − Variable cost per unit)" },
  { term: "Contribution margin", definition: "Selling price minus variable costs; the amount available to cover fixed costs and profit.", category: "Corporate finance", programs: ["cma-us", "acca"] },
  { term: "Relevant cost", definition: "A future cost that differs between alternatives; sunk and unavoidable costs are irrelevant to the decision.", category: "Corporate finance", programs: ["cma-us", "acca"] },
  { term: "Operating leverage", definition: "Sensitivity of operating income to changes in sales, driven by the share of fixed costs.", category: "Corporate finance", programs: ["cfa", "cma-us"] },
  { term: "Financial leverage (gearing)", definition: "Use of debt in the capital structure, which magnifies returns and risk to shareholders.", category: "Corporate finance", programs: ["cfa", "acca", "cma-us"] },
  { term: "Residual income", definition: "Operating income minus a charge for the capital employed.", category: "Corporate finance", programs: ["cma-us", "cfa", "acca"], formula: "Income − Required rate × Invested capital" },
  { term: "DuPont analysis", definition: "Decomposing return on equity into profit margin, asset turnover and financial leverage.", category: "Corporate finance", programs: ["cfa", "cma-us", "acca"], formula: "ROE = NI/Sales × Sales/Assets × Assets/Equity" },
  { term: "Current ratio", definition: "Current assets divided by current liabilities.", category: "Corporate finance", programs: ["cfa", "acca", "cma-us", "ca-india"] },
  { term: "Quick ratio", definition: "Liquid current assets (cash, marketable securities, receivables) divided by current liabilities.", category: "Corporate finance", programs: ["cfa", "acca", "cma-us"] },

  // Economics
  { term: "Price elasticity of demand", definition: "Percentage change in quantity demanded divided by the percentage change in price; elastic if its absolute value exceeds 1.", category: "Economics", programs: ["ca-india", "cfa"], formula: "%ΔQ / %ΔP (midpoint method)" },
  { term: "Marginal utility", definition: "The additional satisfaction from consuming one more unit; tends to diminish as consumption increases.", category: "Economics", programs: ["ca-india"] },
  { term: "Perfect competition", definition: "Many firms selling identical products with free entry; each firm is a price taker facing a horizontal demand curve.", category: "Economics", programs: ["ca-india", "cfa"] },
  { term: "Monopoly", definition: "A single seller with significant barriers to entry, facing the market demand curve and setting output where MR = MC.", category: "Economics", programs: ["ca-india", "cfa"] },
  { term: "Inflation", definition: "A sustained rise in the general price level, reducing the purchasing power of money.", category: "Economics", programs: ["cfa", "ca-india", "cfp"] },
  { term: "Real interest rate", definition: "The nominal rate adjusted for inflation.", category: "Economics", programs: ["cfa", "cfp", "frm"], formula: "(1 + nominal) / (1 + inflation) − 1" },
  { term: "Monetary policy", definition: "Central bank actions on interest rates, reserves and asset purchases to influence inflation and growth.", category: "Economics", programs: ["cfa", "ca-india"] },
  { term: "Fiscal policy", definition: "Government decisions on spending and taxation to influence the economy.", category: "Economics", programs: ["cfa", "ca-india"] },
  { term: "Business cycle", definition: "Fluctuations in economic activity through expansion, peak, contraction and trough.", category: "Economics", programs: ["cfa", "ca-india"] },
  { term: "Cross rate", definition: "An exchange rate between two currencies calculated through a third currency.", category: "Economics", programs: ["cfa", "frm"] },

  // Quantitative methods
  { term: "Time value of money", definition: "The principle that money available today is worth more than the same amount in the future because it can earn a return.", category: "Quantitative methods", programs: ["cfa", "frm", "cfp", "ca-india", "cma-us"] },
  { term: "Annuity due", definition: "A series of equal payments made at the start of each period (for example rent or a SIP).", category: "Quantitative methods", programs: ["cfa", "cfp", "nism"] },
  { term: "Effective annual rate (EAR)", definition: "The annual rate that reflects the effect of compounding within the year.", category: "Quantitative methods", programs: ["cfa", "frm", "cfp", "ca-india"], formula: "(1 + r/m)^m − 1" },
  { term: "Simple interest", definition: "Interest calculated only on the original principal.", category: "Quantitative methods", programs: ["ca-india", "cfp"], formula: "P × r × t" },
  { term: "Compound interest", definition: "Interest earned on both principal and previously earned interest.", category: "Quantitative methods", programs: ["ca-india", "cfa", "cfp"] },
  { term: "Expected value", definition: "Probability-weighted average of possible outcomes.", category: "Quantitative methods", programs: ["cfa", "frm"], formula: "Σ pᵢ xᵢ" },
  { term: "Standard deviation", definition: "Square root of variance; a measure of dispersion around the mean.", category: "Quantitative methods", programs: ["cfa", "frm", "caia", "cfp"] },
  { term: "Correlation", definition: "A standardised measure (−1 to +1) of how two variables move together.", category: "Quantitative methods", programs: ["cfa", "frm", "caia"] },
  { term: "Bayes' theorem", definition: "A rule for updating a probability with new evidence.", category: "Quantitative methods", programs: ["frm", "cfa"], formula: "P(A|B) = P(B|A) P(A) / P(B)" },
  { term: "p-value", definition: "The probability of observing a test statistic at least as extreme as the one found, if the null hypothesis were true.", category: "Quantitative methods", programs: ["frm", "cfa"] },
  { term: "Type I error", definition: "Rejecting a true null hypothesis; its probability is the significance level α.", category: "Quantitative methods", programs: ["frm", "cfa"] },
  { term: "Type II error", definition: "Failing to reject a false null hypothesis.", category: "Quantitative methods", programs: ["frm", "cfa"] },
  { term: "R-squared", definition: "The proportion of variation in the dependent variable explained by a regression.", category: "Quantitative methods", programs: ["frm", "cfa"] },

  // Fixed income
  { term: "Yield to maturity", definition: "The single discount rate that equates a bond's price with the present value of its cash flows, assuming it is held to maturity.", category: "Fixed income", programs: ["cfa", "frm", "cfp"] },
  { term: "Coupon rate", definition: "The annual interest a bond pays as a percentage of its face value.", category: "Fixed income", programs: ["cfa", "frm", "cfp", "nism"] },
  { term: "Macaulay duration", definition: "Weighted-average time to receive a bond's cash flows, weighted by present value.", category: "Fixed income", programs: ["cfa", "frm"] },
  { term: "Modified duration", definition: "Approximate percentage price change for a 1% change in yield.", category: "Fixed income", programs: ["cfa", "frm", "caia"], formula: "Macaulay duration / (1 + y)" },
  { term: "Convexity", definition: "Curvature of the price–yield relationship; positive convexity benefits the bondholder when yields move.", category: "Fixed income", programs: ["cfa", "frm"] },
  { term: "Credit spread", definition: "The extra yield over a benchmark (usually government) bond that compensates for credit and liquidity risk.", category: "Fixed income", programs: ["cfa", "frm", "caia"] },
  { term: "Discount bond", definition: "A bond trading below face value because its coupon rate is below the market yield.", category: "Fixed income", programs: ["cfa", "cpa-us", "frm"] },

  // Equity and portfolio
  { term: "Beta", definition: "Sensitivity of an asset's returns to market returns; a measure of systematic risk.", category: "Equity and portfolio", programs: ALL_INVEST },
  { term: "CAPM", definition: "Capital asset pricing model: required return equals the risk-free rate plus beta times the market risk premium.", category: "Equity and portfolio", programs: ALL_INVEST, formula: "E(R) = Rf + β[E(Rm) − Rf]" },
  { term: "Systematic risk", definition: "Market-wide risk that cannot be diversified away.", category: "Equity and portfolio", programs: ALL_INVEST },
  { term: "Unsystematic risk", definition: "Company- or industry-specific risk that can be reduced by diversification.", category: "Equity and portfolio", programs: ALL_INVEST },
  { term: "Sharpe ratio", definition: "Excess return per unit of total risk.", category: "Equity and portfolio", programs: ALL_INVEST, formula: "(Rp − Rf) / σp" },
  { term: "Treynor ratio", definition: "Excess return per unit of systematic risk.", category: "Equity and portfolio", programs: ["cfa", "frm", "cfp"], formula: "(Rp − Rf) / βp" },
  { term: "Jensen's alpha", definition: "A portfolio's return in excess of its CAPM-required return.", category: "Equity and portfolio", programs: ["cfa", "frm", "caia"] },
  { term: "Efficient market hypothesis", definition: "Prices reflect available information; weak, semi-strong and strong forms differ in which information is reflected.", category: "Equity and portfolio", programs: ["cfa", "cfp"] },
  { term: "Gordon growth model", definition: "Values a stock as next year's dividend divided by the required return minus the constant growth rate.", category: "Equity and portfolio", programs: ["cfa"], formula: "V₀ = D₁ / (r − g)" },
  { term: "Asset allocation", definition: "Dividing a portfolio among asset classes to balance return objectives with risk tolerance and constraints.", category: "Equity and portfolio", programs: ["cfa", "cfp", "caia"] },
  { term: "Loss aversion", definition: "The tendency to feel losses more strongly than equivalent gains, often leading investors to hold losing positions too long.", category: "Equity and portfolio", programs: ["cfa", "cfp"] },

  // Derivatives
  { term: "Forward contract", definition: "An OTC agreement to buy or sell an asset at a fixed price on a future date.", category: "Derivatives", programs: ["cfa", "frm", "caia"] },
  { term: "Futures contract", definition: "An exchange-traded, standardised forward that is marked to market daily through a clearing house.", category: "Derivatives", programs: ["cfa", "frm", "caia", "nism"] },
  { term: "Mark to market", definition: "Daily settlement of gains and losses on futures through margin accounts.", category: "Derivatives", programs: ["frm", "cfa", "nism"] },
  { term: "Call option", definition: "The right, but not the obligation, to buy an asset at the strike price.", category: "Derivatives", programs: ["cfa", "frm", "nism", "caia"] },
  { term: "Put option", definition: "The right, but not the obligation, to sell an asset at the strike price.", category: "Derivatives", programs: ["cfa", "frm", "nism", "caia"] },
  { term: "Put-call parity", definition: "A no-arbitrage relationship linking European call and put prices with the same strike and expiry.", category: "Derivatives", programs: ["cfa", "frm"], formula: "c + X/(1 + r)^T = p + S" },
  { term: "Interest rate swap", definition: "An agreement to exchange fixed-rate interest payments for floating-rate payments on a notional principal.", category: "Derivatives", programs: ["cfa", "frm"] },
  { term: "Contango", definition: "A futures market where longer-dated contracts trade above near-dated contracts (or spot); rolling long positions earns negative roll yield.", category: "Derivatives", programs: ["caia", "frm", "cfa"] },
  { term: "Backwardation", definition: "A futures market where longer-dated contracts trade below near-dated contracts (or spot); rolling long positions earns positive roll yield.", category: "Derivatives", programs: ["caia", "frm", "cfa"] },

  // Risk management
  { term: "Value at risk (VaR)", definition: "A loss threshold that is not expected to be exceeded over a horizon at a given confidence level.", category: "Risk management", programs: ["frm", "cfa", "caia"] },
  { term: "Expected shortfall", definition: "The average loss given that the loss exceeds VaR; a coherent risk measure.", category: "Risk management", programs: ["frm"] },
  { term: "Expected loss (credit)", definition: "Probability of default × loss given default × exposure at default.", category: "Risk management", programs: ["frm", "cfa"], formula: "EL = PD × LGD × EAD" },
  { term: "Loss given default (LGD)", definition: "The share of an exposure lost if the borrower defaults; equal to 1 minus the recovery rate.", category: "Risk management", programs: ["frm", "cfa"] },
  { term: "Enterprise risk management (ERM)", definition: "An integrated, firm-wide approach to identifying and managing risks in line with risk appetite.", category: "Risk management", programs: ["frm", "cma-us"] },
  { term: "Risk appetite", definition: "The amount and type of risk an organisation is willing to accept in pursuit of its objectives.", category: "Risk management", programs: ["frm", "cma-us", "cfa"] },
  { term: "Liquidity risk", definition: "The risk of being unable to meet obligations (funding liquidity) or to trade without moving prices (market liquidity).", category: "Risk management", programs: ["frm", "cfa", "caia"] },
  { term: "Operational risk", definition: "Risk of loss from inadequate or failed processes, people and systems, or external events.", category: "Risk management", programs: ["frm"] },

  // Alternatives
  { term: "Management fee", definition: "An annual fee charged on assets under management (or committed capital) regardless of performance.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "Incentive fee", definition: "A share of profits paid to a hedge fund manager, often 20%, subject to hurdles and high-water marks.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "High-water mark", definition: "The highest NAV on which an incentive fee was paid; new incentive fees are earned only above it.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "Hurdle rate", definition: "A minimum return before incentive fees apply; hard hurdles charge fees only on the excess, soft hurdles on the whole return once cleared.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "Carried interest", definition: "The general partner's share of a private equity fund's profits, typically paid after investors receive a preferred return.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "J-curve", definition: "The pattern of negative early returns followed by positive later returns typical of private equity funds.", category: "Alternative investments", programs: ["caia", "cfa"] },
  { term: "Capitalisation rate", definition: "Net operating income divided by property value; used to value income-producing real estate.", category: "Alternative investments", programs: ["caia", "cfa"], formula: "Value = NOI / cap rate" },
  { term: "REIT", definition: "Real estate investment trust: a listed vehicle that owns income-producing property and distributes most of its income.", category: "Alternative investments", programs: ["caia", "cfa", "cfp"] },
  { term: "Tranche", definition: "A slice of a securitisation with a defined priority for receiving cash flows and absorbing losses.", category: "Alternative investments", programs: ["caia", "frm", "cfa"] },

  // Personal finance
  { term: "Emergency fund", definition: "Liquid savings, often three to six months of essential expenses, held for unexpected costs.", category: "Personal finance", programs: ["cfp"] },
  { term: "Deductible", definition: "The amount an insured person pays before the insurer pays a claim.", category: "Personal finance", programs: ["cfp"] },
  { term: "Coinsurance", definition: "Cost sharing after the deductible, such as 80/20 where the insured pays 20%.", category: "Personal finance", programs: ["cfp"] },
  { term: "Term life insurance", definition: "Life cover for a set period with no cash value; usually the cheapest way to cover a temporary need.", category: "Personal finance", programs: ["cfp"] },
  { term: "Probate", definition: "The court process of validating a will and administering a deceased person's estate.", category: "Personal finance", programs: ["cfp"] },
  { term: "Tax credit vs deduction", definition: "A credit reduces tax payable directly; a deduction reduces taxable income, so its value depends on the marginal rate.", category: "Personal finance", programs: ["cfp", "ea-us", "cpa-us"] },
  { term: "Marginal tax rate", definition: "The rate applied to the next unit of taxable income.", category: "Personal finance", programs: ["cfp", "ea-us", "cpa-us", "cta-uk"] },
  { term: "Sequence-of-returns risk", definition: "The risk that poor returns early in retirement deplete savings faster, even if average returns are acceptable.", category: "Personal finance", programs: ["cfp"] },
  { term: "Net asset value (NAV)", definition: "A fund's assets minus liabilities, divided by units outstanding.", category: "Personal finance", programs: ["nism", "cfp", "caia"], formula: "(Assets − Liabilities) / Units" },
  { term: "SIP", definition: "Systematic investment plan: investing a fixed amount in a mutual fund at regular intervals.", category: "Personal finance", programs: ["nism", "cfp"] },
  { term: "Exit load", definition: "A charge deducted from the redemption value when units are redeemed within a specified period.", category: "Personal finance", programs: ["nism"] },
  { term: "Expense ratio", definition: "A fund's annual operating costs as a percentage of its average assets.", category: "Personal finance", programs: ["nism", "cfp", "cfa"] },
  { term: "Riskometer", definition: "SEBI-mandated six-level label showing a mutual fund scheme's risk, from Low to Very High.", category: "Personal finance", programs: ["nism"] },
  { term: "ELSS", definition: "Equity Linked Savings Scheme: a tax-saving equity mutual fund in India with a three-year lock-in.", category: "Personal finance", programs: ["nism"] },

  // Ethics and regulation
  { term: "Fiduciary duty", definition: "A duty to act in the client's best interests with loyalty and care.", category: "Ethics and regulation", programs: ["cfp", "cfa", "caia"] },
  { term: "Independence", definition: "Freedom from relationships or interests that would compromise (or appear to compromise) objectivity, essential for auditors.", category: "Ethics and regulation", programs: ["cpa-us", "acca", "ca-india", "cfa"] },
  { term: "Material nonpublic information", definition: "Information not available to the public that would affect a security's price; trading on it is prohibited.", category: "Ethics and regulation", programs: ["cfa", "caia", "nism"] },
  { term: "Priority of transactions", definition: "Client trades take precedence over employer trades, which take precedence over personal trades.", category: "Ethics and regulation", programs: ["cfa", "caia"] },
  { term: "Front-running", definition: "Trading ahead of a client's order to benefit from its expected price impact; prohibited.", category: "Ethics and regulation", programs: ["cfa", "caia", "nism"] },
  { term: "SEBI", definition: "Securities and Exchange Board of India: the regulator of India's securities markets, including mutual funds.", category: "Ethics and regulation", programs: ["nism", "ca-india"] },
  { term: "AMFI", definition: "Association of Mutual Funds in India: the industry body that registers mutual fund distributors (ARN).", category: "Ethics and regulation", programs: ["nism"] },
  { term: "KYC", definition: "Know Your Customer: verifying a client's identity and address before opening an account.", category: "Ethics and regulation", programs: ["nism", "cfp"] },

  // Law
  { term: "Contract", definition: "An agreement enforceable by law (Indian Contract Act, 1872, Section 2(h)).", category: "Law", programs: ["ca-india", "cpa-us"] },
  { term: "Consideration", definition: "Something of value given in exchange for a promise; under Indian law it may move from the promisee or any other person.", category: "Law", programs: ["ca-india", "cpa-us"] },
  { term: "Void agreement", definition: "An agreement not enforceable by law, such as an agreement with a minor under Indian law.", category: "Law", programs: ["ca-india"] },
  { term: "Free consent", definition: "Consent not caused by coercion, undue influence, fraud, misrepresentation or mistake.", category: "Law", programs: ["ca-india"] },
];

export const GLOSSARY_CATEGORIES = Array.from(new Set(GLOSSARY.map((t) => t.category)));
