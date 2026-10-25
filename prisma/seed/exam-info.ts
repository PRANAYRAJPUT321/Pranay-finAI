/**
 * Exam facts researched on 24 Oct 2026 from the sources listed per entry.
 * Many figures come from reputable prep providers rather than the awarding
 * body itself, and sources sometimes disagree; every entry is therefore marked
 * verified: false and the UI tells learners to confirm on the official site.
 */
import type { ExamInfo } from "../../src/server/catalog/exam-info";

const AS_OF = "2026-10-24";

const CFA_SOURCES = [
  { title: "CFA Institute — exam results pass-rate infographic", url: "https://www.cfainstitute.org/sites/default/files/docs/programs/cfa-program/cfa-exam-results-pass-rate-infographic.pdf" },
  { title: "LearnSignal — CFA exam windows 2026–27", url: "https://www.learnsignal.com/blog/cfa-exam-windows-and-deferral-policy-2026/" },
  { title: "Soleadea — 2027 CFA exam dates & schedule", url: "https://soleadea.org/cfa-2027-dates-schedule" },
  { title: "PW — CFA program fees 2026–2027", url: "https://www.pw.live/cfa/exams/cfa-program-fees-2026-2027" },
];
const FRM_SOURCES = [
  { title: "QuintEdge — FRM exam dates", url: "https://quintedge.com/frm-exam-dates" },
  { title: "300Hours — FRM fees", url: "https://300hours.com/frm-fees/" },
  { title: "AnalystPrep — FRM pass rates 2026", url: "https://analystprep.com/blog/frm-pass-rate-2026/" },
];
const CAIA_SOURCES = [
  { title: "CAIA Association — registration dates & fees", url: "https://caia.org/registration" },
  { title: "300Hours — CAIA exam dates and pass rates", url: "https://300hours.com/caia-exam-dates/" },
];
const CPA_SOURCES = [
  { title: "LearnSignal — US CPA exam fees 2026", url: "https://www.learnsignal.com/blog/us-cpa-exam-fees-cost-2026/" },
  { title: "300Hours — CPA pass rates", url: "https://300hours.com/cpa-pass-rates/" },
  { title: "Efficient Learning — CPA exam pass rates", url: "https://efficientlearning.com/cpa/resources/cpa-exam-pass-rates/" },
];
const ACCA_SOURCES = [
  { title: "300Hours — ACCA exam fees", url: "https://300hours.com/acca-exam-fees/" },
  { title: "LearnSignal — ACCA exam dates 2026", url: "https://learnsignal.com/blog/acca-exam-dates" },
];
const CMA_SOURCES = [
  { title: "IMA — Enroll in the CMA program (fees)", url: "https://www.imanet.org/cma-certification/getting-started" },
  { title: "UWorld — All about the CMA exam", url: "https://accounting.uworld.com/cma-review/cma-exam/" },
];
const ICAI_SOURCES = [
  { title: "Careers360 — ICAI CA January 2027 exam dates", url: "https://news.careers360.com/icai-ca-foundation-intermediate-exam-date-january-2027-out-icai-org-schedule-paper-timings" },
  { title: "StudyCafe — ICAI announces CA January 2027 schedule", url: "https://studycafe.in/icai-announces-ca-january-2027-exam-schedule-check-dates-and-timings-427141.html" },
];
const EA_SOURCES = [
  { title: "IRS — Enrolled agents FAQ", url: "https://www.irs.gov/tax-professionals/enrolled-agents/enrolled-agents-frequently-asked-questions" },
  { title: "NAEA — About the SEE exam", url: "https://www.naea.org/enrolled-agent-exam/" },
  { title: "Miles Education — EA exam fees explained", url: "https://www.mileseducation.com/blog/accounting/enrolled-agent-exam-fees-explained-all-you-need-to-know" },
];
const CFP_SOURCES = [
  { title: "CFP Board — upcoming exam dates & registration", url: "https://www.cfp.net/certification-process/exam-requirement/registration/upcoming-exam-dates-and-registration-process" },
  { title: "300Hours — CFP exam dates 2026–2027", url: "https://300hours.com/cfp-exam-dates/" },
];

const cfaFees = (early: string, standard: string) => [
  { label: "Early registration", amount: early },
  { label: "Standard registration", amount: standard },
  { label: "Rescheduling within a window", amount: "US$250", note: "reported by a prep provider" },
];

export const examInfo: Record<string, ExamInfo> = {
  "cfa:L1": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.cfainstitute.org/programs/cfa-program",
    registrationUrl: "https://www.cfainstitute.org/programs/cfa-program/register",
    format: "180 multiple-choice questions in two 2h15m sessions", delivery: "Computer-based at Prometric test centres",
    fees: cfaFees("US$1,140", "US$1,490"),
    upcoming: [
      { label: "February 2027", dates: "22–28 Feb 2027", start: "2027-02-22", end: "2027-02-28", registration: "Standard registration closes 5 Nov 2026; scheduling deadline 10 Nov 2026", deadline: "2026-11-05" },
      { label: "May 2027", dates: "11–17 May 2027", start: "2027-05-11", end: "2027-05-17", registration: "Early deadline 14 Oct 2026 (passed); standard deadline 10 Feb 2027", deadline: "2027-02-10" },
      { label: "August 2027", dates: "15–22 Aug 2027", start: "2027-08-15", end: "2027-08-22", registration: "Registration dates not yet announced" },
      { label: "November 2027", dates: "13–19 Nov 2027", start: "2027-11-13", end: "2027-11-19", registration: "Registration dates not yet announced" },
    ],
    passRate: { value: "39%–45%", period: "Feb 2026 45%, May 2026 39% (10-year average ≈ 40%)", official: true },
    difficulty: 3, difficultyNote: "Broad syllabus across ten topics; roughly four in ten candidates pass.",
    studyHours: "≈ 300 hours (commonly recommended)",
    passingStandard: "Set by CFA Institute after each exam; no fixed published score.",
    notes: ["Third-party sources report the February 2027 window is the first on the updated curriculum."],
    sources: CFA_SOURCES,
  },
  "cfa:L2": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.cfainstitute.org/programs/cfa-program",
    registrationUrl: "https://www.cfainstitute.org/programs/cfa-program/register",
    format: "Item sets (vignettes with multiple-choice questions) in two sessions", delivery: "Computer-based at Prometric test centres",
    fees: cfaFees("US$1,140", "US$1,490"),
    upcoming: [
      { label: "May 2027", dates: "18–22 May 2027", start: "2027-05-18", end: "2027-05-22", registration: "Standard deadline reported as 10 Feb 2027", deadline: "2027-02-10" },
      { label: "August 2027", dates: "23–27 Aug 2027", start: "2027-08-23", end: "2027-08-27", registration: "Registration dates not yet announced" },
      { label: "November 2027", dates: "20–24 Nov 2027", start: "2027-11-20", end: "2027-11-24", registration: "Registration dates not yet announced" },
    ],
    passRate: { value: "42%–44%", period: "Aug 2025 44%, Nov 2025 42%, May 2026 43%", official: true },
    difficulty: 4, difficultyNote: "Application-heavy item sets; valuation and financial reporting depth.",
    studyHours: "≈ 300+ hours",
    passingStandard: "Set by CFA Institute after each exam.",
    notes: [],
    sources: CFA_SOURCES,
  },
  "cfa:L3": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.cfainstitute.org/programs/cfa-program",
    registrationUrl: "https://www.cfainstitute.org/programs/cfa-program/register",
    format: "Item sets and constructed-response (essay) questions; core plus a chosen pathway", delivery: "Computer-based at Prometric test centres",
    fees: cfaFees("US$1,240", "US$1,590"),
    upcoming: [
      { label: "February 2027", dates: "18–21 Feb 2027", start: "2027-02-18", end: "2027-02-21", registration: "Standard registration closes 5 Nov 2026", deadline: "2026-11-05" },
      { label: "August 2027", dates: "11–14 Aug 2027", start: "2027-08-11", end: "2027-08-14", registration: "Registration dates not yet announced" },
    ],
    passRate: { value: "≈ 50%", period: "Aug 2025 50%, Feb 2026 50%", official: true },
    difficulty: 4, difficultyNote: "Portfolio synthesis and written answers graded by humans.",
    studyHours: "≈ 300+ hours",
    passingStandard: "Set by CFA Institute after each exam.",
    notes: [],
    sources: CFA_SOURCES,
  },
  "frm:PART1": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.garp.org/frm", registrationUrl: "https://www.garp.org/frm/register",
    format: "100 multiple-choice questions, 4 hours", delivery: "Computer-based at PSI test centres (ATA in some regions)",
    fees: [
      { label: "One-time enrollment", amount: "US$400", note: "paid with the first Part I booking" },
      { label: "Early registration (per part)", amount: "US$600" },
      { label: "Standard registration (per part)", amount: "US$800" },
    ],
    upcoming: [
      { label: "May 2027", dates: "Exam dates to be announced by GARP", registration: "Early: 1 Dec 2026 – 31 Jan 2027; standard: 1 Feb – 31 Mar 2027", deadline: "2027-01-31" },
      { label: "August & November 2027", dates: "To be announced", registration: "Not yet published" },
    ],
    passRate: { value: "≈ 47%", period: "Nov 2025 (long-run average ≈ 47%)", official: false },
    difficulty: 3, difficultyNote: "Quantitative; strong statistics and derivatives foundations help.",
    studyHours: "≈ 200–250 hours", passingStandard: "Determined by GARP each window; no fixed score.",
    notes: [], sources: FRM_SOURCES,
  },
  "frm:PART2": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.garp.org/frm", registrationUrl: "https://www.garp.org/frm/register",
    format: "80 multiple-choice questions, 4 hours", delivery: "Computer-based at PSI test centres",
    fees: [
      { label: "Early registration", amount: "US$600" },
      { label: "Standard registration", amount: "US$800" },
    ],
    upcoming: [{ label: "May 2027", dates: "Exam dates to be announced by GARP", registration: "Early: 1 Dec 2026 – 31 Jan 2027; standard: 1 Feb – 31 Mar 2027", deadline: "2027-01-31" }],
    passRate: { value: "≈ 50%", period: "Nov 2025 (long-run average ≈ 56%)", official: false },
    difficulty: 4, difficultyNote: "Applied market, credit, operational and liquidity risk.",
    studyHours: "≈ 200–250 hours", passingStandard: "Determined by GARP each window.",
    notes: [], sources: FRM_SOURCES,
  },
  "caia:L1": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://caia.org/caia-program", registrationUrl: "https://caia.org/registration",
    format: "Multiple-choice questions", delivery: "Computer-based",
    fees: [
      { label: "One-time enrollment", amount: "US$400", note: "third-party figure" },
      { label: "Exam — early / standard", amount: "US$995 / US$1,395", note: "third-party figure" },
    ],
    upcoming: [
      { label: "March 2027", dates: "1–12 Mar 2027", start: "2027-03-01", end: "2027-03-12", registration: "Opened 12 Oct 2026; early deadline 7 Dec 2026; closes 1 Feb 2027", deadline: "2026-12-07" },
      { label: "September 2027", dates: "30 Aug – 10 Sep 2027", start: "2027-08-30", end: "2027-09-10", registration: "Opens 12 Apr 2027" },
    ],
    passRate: { value: "≈ 45%–54%", period: "Recent windows (Mar 2026 ≈ 45%)", official: false },
    difficulty: 3, difficultyNote: "Alternative-investment breadth with quantitative content.",
    studyHours: "≈ 200 hours", notes: [], sources: CAIA_SOURCES,
  },
  "caia:L2": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://caia.org/caia-program", registrationUrl: "https://caia.org/registration",
    format: "Multiple-choice and constructed-response questions", delivery: "Computer-based",
    fees: [{ label: "Exam — early / standard", amount: "US$995 / US$1,395", note: "third-party figure" }],
    upcoming: [
      { label: "March 2027", dates: "15–26 Mar 2027", start: "2027-03-15", end: "2027-03-26", registration: "Early deadline 7 Dec 2026; closes 1 Feb 2027", deadline: "2026-12-07" },
      { label: "September 2027", dates: "16–24 Sep 2027", start: "2027-09-16", end: "2027-09-24", registration: "Opens 12 Apr 2027" },
    ],
    passRate: { value: "≈ 57%–65%", period: "Recent windows (Mar 2026 ≈ 64%)", official: false },
    difficulty: 4, difficultyNote: "Portfolio management and written responses.",
    studyHours: "≈ 200 hours", notes: [], sources: CAIA_SOURCES,
  },
  ...Object.fromEntries(
    ([
      ["FAR", "Financial Accounting and Reporting", "≈ 42%", 5, "Widely considered the most demanding core section — broad and detailed."],
      ["AUD", "Auditing and Attestation", "≈ 48%", 4, "Audit concepts and judgement-heavy simulations."],
      ["REG", "Taxation and Regulation", "≈ 63%", 3, "Federal tax and business law; highest core pass rate."],
      ["BAR", "Business Analysis and Reporting", "≈ 42%", 4, "Advanced financial reporting and data analytics."],
      ["ISC", "Information Systems and Controls", "Not published in our sources", 3, "IT governance, controls and SOC engagements."],
      ["TCP", "Tax Compliance and Planning", "Not published in our sources", 3, "Individual and entity tax planning."],
    ] as const).map(([code, name, rate, diff, note]) => [
      `cpa-us:${code}`,
      {
        asOf: AS_OF, verified: false,
        officialUrl: "https://www.aicpa-cima.com/resources/landing/cpa-exam", registrationUrl: "https://nasba.org/exams/cpaexam/",
        format: `${name}: 4 hours, multiple-choice testlets and task-based simulations`, delivery: "Computer-based at Prometric centres; testing is continuous (year-round)",
        fees: [
          { label: "Section exam fee (NASBA-recommended)", amount: "≈ US$262.64–268.59" },
          { label: "State application / registration fees", amount: "Varies by state board", note: "typically $10–$150+ per section" },
        ],
        feeNote: "Fees are set by each state board of accountancy.",
        upcoming: [{ label: "Continuous testing", dates: "Schedule any time after receiving your Notice to Schedule", registration: "Apply through your state board / NASBA" }],
        passRate: { value: rate, period: code === "ISC" || code === "TCP" ? "—" : "2025 cumulative", official: false },
        difficulty: diff, difficultyNote: note,
        passingStandard: "Scaled score of 75 (not a percentage).",
        notes: [], sources: CPA_SOURCES,
      } satisfies ExamInfo,
    ]),
  ),
  ...Object.fromEntries(
    ([
      ["FA", "Applied Knowledge — Financial Accounting", "On-demand computer-based exam", 1, "High pass rates at Applied Knowledge level (≈ 80%+ reported)."],
      ["MA", "Applied Knowledge — Management Accounting", "On-demand computer-based exam", 1, "Foundational cost and management accounting."],
      ["FR", "Applied Skills — Financial Reporting", "Session-based CBE (Mar, Jun, Sep, Dec)", 3, "IFRS consolidation and interpretation."],
      ["AA", "Applied Skills — Audit and Assurance", "Session-based CBE (Mar, Jun, Sep, Dec)", 3, "Audit process and written scenario answers."],
      ["FM", "Applied Skills — Financial Management", "Session-based CBE (Mar, Jun, Sep, Dec)", 3, "Investment appraisal, working capital, risk."],
      ["SBR", "Strategic Professional — Strategic Business Reporting", "Session-based CBE (Mar, Jun, Sep, Dec)", 5, "Strategic Professional pass rates ≈ 33–48%."],
    ] as const).map(([code, name, delivery, diff, note]) => [
      `acca:${code}`,
      {
        asOf: AS_OF, verified: false,
        officialUrl: "https://www.accaglobal.com/gb/en/student.html", registrationUrl: "https://www.accaglobal.com/gb/en/student/exam-entry-and-administration.html",
        format: name, delivery,
        fees: [
          { label: "Initial registration", amount: "≈ £89" },
          { label: "Annual subscription", amount: "≈ £140" },
          { label: code === "SBR" ? "SBR exam (standard entry)" : code === "FA" || code === "MA" ? "Applied Knowledge exam" : "Applied Skills exam (standard entry)", amount: code === "SBR" ? "≈ £208–229" : code === "FA" || code === "MA" ? "Varies by learning provider / centre" : "≈ £160–173" },
        ],
        feeNote: "Early entry is cheaper and late entry much more expensive; fees vary by session.",
        upcoming: code === "FA" || code === "MA"
          ? [{ label: "On demand", dates: "Book any time at a computer-based exam centre" }]
          : [{ label: "December 2026", dates: "1–5 Dec 2026 (reported)", start: "2026-12-01", end: "2026-12-05" }, { label: "March 2027", dates: "Early March 2027 (to be confirmed)" }],
        passRate: { value: code === "SBR" ? "≈ 33%–48%" : code === "FA" || code === "MA" ? "≈ 80%+" : "≈ 40%–50%", period: "Recent sessions (third-party estimates)", official: false },
        difficulty: diff, difficultyNote: note,
        passingStandard: "50%",
        notes: ["ACCA is restructuring the qualification from 2027 (reported: 13 → 11 exams)."],
        sources: ACCA_SOURCES,
      } satisfies ExamInfo,
    ]),
  ),
  ...Object.fromEntries(
    (["P1", "P2"] as const).map((code) => [
      `cma-us:${code}`,
      {
        asOf: AS_OF, verified: false,
        officialUrl: "https://www.imanet.org/cma-certification", registrationUrl: "https://www.imanet.org/cma-certification/getting-started",
        format: code === "P1" ? "Part 1: 100 multiple-choice questions + 2 scenarios, 4 hours" : "Part 2: 100 multiple-choice questions + 2 scenarios, 4 hours", delivery: "Computer-based at Prometric centres in testing windows",
        fees: [
          { label: "CMA entrance fee (professional / student)", amount: "US$300 / US$225" },
          { label: "Exam fee per part (professional / student)", amount: "US$545 / US$407" },
          { label: "IMA membership (professional)", amount: "US$295 per year" },
          { label: "Rescheduling (30+ days ahead)", amount: "US$50" },
        ],
        upcoming: [
          { label: "Jan/Feb 2027", dates: "January–February 2027", registration: "Last registration day typically 15 February", deadline: "2027-02-15" },
          { label: "May/Jun 2027", dates: "May–June 2027", registration: "Last registration day typically 15 June" },
          { label: "Sep/Oct 2027", dates: "September–October 2027", registration: "Last registration day typically 15 October" },
        ],
        passRate: { value: "≈ 45%–50%", period: "Older published estimates", official: false },
        difficulty: 4, difficultyNote: "Two dense parts with scenario questions.",
        studyHours: "≈ 150–170 hours per part", notes: [], sources: CMA_SOURCES,
      } satisfies ExamInfo,
    ]),
  ),
  "ca-india:FND": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.icai.org", registrationUrl: "https://eservices.icai.org",
    format: "4 papers (2 subjective, 2 objective)", delivery: "Pen-and-paper at ICAI centres",
    fees: [{ label: "Exam fee", amount: "See ICAI notification", note: "late fee ₹600 / US$10 reported for 2026" }],
    upcoming: [{ label: "January 2027", dates: "3, 5, 7 & 9 Jan 2027", start: "2027-01-03", end: "2027-01-09", registration: "Form opens 3 Nov 2026; last date without late fee 16 Nov 2026", deadline: "2026-11-16" }],
    difficulty: 3, difficultyNote: "Entry level; accounting, law, maths and economics.",
    notes: [], sources: ICAI_SOURCES,
  },
  "ca-india:INT": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.icai.org", registrationUrl: "https://eservices.icai.org",
    format: "Two groups of three papers", delivery: "Pen-and-paper at ICAI centres",
    fees: [{ label: "Exam fee", amount: "See ICAI notification" }],
    upcoming: [{ label: "January 2027", dates: "Group I: 2, 4, 6 Jan 2027 · Group II: 8, 10, 12 Jan 2027", start: "2027-01-02", end: "2027-01-12", registration: "Form opens 3 Nov 2026; last date without late fee 16 Nov 2026", deadline: "2026-11-16" }],
    difficulty: 4, difficultyNote: "Substantial accounting, tax and audit depth.",
    notes: [], sources: ICAI_SOURCES,
  },
  "ca-india:FIN": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.icai.org", registrationUrl: "https://eservices.icai.org",
    format: "Final papers in two groups", delivery: "Pen-and-paper at ICAI centres",
    fees: [{ label: "Exam fee", amount: "See ICAI notification" }],
    upcoming: [{ label: "May 2027", dates: "To be announced (Final runs in May and November)" }],
    difficulty: 5, difficultyNote: "Among the most demanding professional exams in India.",
    notes: [], sources: ICAI_SOURCES,
  },
  ...Object.fromEntries(
    (["P1", "P2", "P3"] as const).map((code) => [
      `ea-us:${code}`,
      {
        asOf: AS_OF, verified: false,
        officialUrl: "https://www.irs.gov/tax-professionals/enrolled-agents", registrationUrl: "https://www.irs.gov/tax-professionals/enrolled-agents/enrolled-agent-information",
        format: "100 multiple-choice questions, 3.5 hours", delivery: "PSI test centres or remote (administered by PSI since 1 Mar 2026)",
        fees: [
          { label: "Exam fee per part", amount: "≈ US$267–317", note: "sources conflict — confirm on PSI" },
          { label: "Enrollment application (Form 23) after passing", amount: "≈ US$140" },
        ],
        upcoming: [{ label: "2026 test cycle (US)", dates: "1 Jul 2026 – 28 Feb 2027 (reported)", end: "2027-02-28", registration: "Scheduling open; international scheduling from 1 Sep 2026" }],
        difficulty: code === "P1" ? 3 : code === "P2" ? 3 : 2, difficultyNote: "Tax-year specific; questions follow the current tax year.",
        notes: ["Pass rates for the new PSI exam had not been published in our sources."], sources: EA_SOURCES,
      } satisfies ExamInfo,
    ]),
  ),
  "nism:VA": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.nism.ac.in/mutual-fund-distributors", registrationUrl: "https://certifications.nism.ac.in",
    format: "100 one-mark multiple-choice questions, 2 hours", delivery: "Computer-based, on demand",
    fees: [{ label: "Exam fee", amount: "₹1,500 + payment gateway charges" }],
    upcoming: [{ label: "On demand", dates: "Book a slot any working day" }],
    difficulty: 1, difficultyNote: "Entry-level certification; pass mark 50%, no negative marking.",
    passingStandard: "50%, no negative marking", notes: [],
    sources: [{ title: "NISM — Series V-A Mutual Fund Distributors", url: "https://www.nism.ac.in/mutual-fund-distributors" }, { title: "NISM — V-A FAQ", url: "https://www.nism.ac.in/frequently-asked-questions-mutual-fund-distributors/" }],
  },
  "nism:VIII": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.nism.ac.in/equity-derivatives", registrationUrl: "https://certifications.nism.ac.in",
    format: "100 questions, 2 hours", delivery: "Computer-based, on demand",
    fees: [{ label: "Exam fee", amount: "₹1,500 + payment gateway charges" }],
    upcoming: [{ label: "On demand", dates: "Book a slot any working day" }],
    difficulty: 3, difficultyNote: "Pass mark 60% with 25% negative marking; certificate valid three years.",
    passingStandard: "60%; 25% negative marking", notes: [],
    sources: [{ title: "NISM — Series VIII Equity Derivatives", url: "https://www.nism.ac.in/equity-derivatives" }, { title: "NISM — VIII FAQ", url: "https://www.nism.ac.in/frequently-asked-questions-equity-derivatives-certification-examination" }],
  },
  "cfp:EXAM": {
    asOf: AS_OF, verified: false,
    officialUrl: "https://www.cfp.net", registrationUrl: "https://www.cfp.net/certification-process/exam-requirement/registration/upcoming-exam-dates-and-registration-process",
    format: "170 multiple-choice questions over two 3-hour sessions", delivery: "Computer-based (Prometric) in three 8-day windows per year",
    fees: [
      { label: "Early bird", amount: "US$825" },
      { label: "Standard", amount: "US$925" },
      { label: "Late (final week)", amount: "US$1,025" },
    ],
    upcoming: [
      { label: "March 2027", dates: "16–23 Mar 2027", start: "2027-03-16", end: "2027-03-23", registration: "Registration opened 21 Oct 2026" },
      { label: "July 2027", dates: "13–20 Jul 2027", start: "2027-07-13", end: "2027-07-20", registration: "Registration opens 17 Feb 2027; education verification by 22 Jun 2027" },
    ],
    difficulty: 4, difficultyNote: "Integrated case-based planning across all domains.",
    notes: ["Pass rates were not found in our sources; see CFP Board's published statistics."], sources: CFP_SOURCES,
  },
};
