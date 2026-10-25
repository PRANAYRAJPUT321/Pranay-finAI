import "server-only";
import { prisma } from "@/server/db";
import { lessonContentSchema, type LessonContent } from "@/server/content/lesson-schema";
import { DIFFICULTY_LABEL } from "@/server/catalog/exam-info";
import { getGuideLevel } from "@/server/catalog/guide";
import { Pdf } from "./pdf";

type FormulaRow = { name: string; category: string; expression: string; variables: unknown; assumptions: string; conventions: string | null; mistakes: string[]; example: unknown };

function variablesOf(v: unknown) {
  return Array.isArray(v) ? (v as { symbol?: string; meaning?: string; unit?: string }[]).map((x) => `${x.symbol ?? ""} = ${x.meaning ?? ""}${x.unit ? ` (${x.unit})` : ""}`) : [];
}

function writeFormula(pdf: Pdf, f: FormulaRow, withExample = true) {
  pdf.h3(`${f.name}  ·  ${f.category}`);
  pdf.box("Formula", [f.expression, ...variablesOf(f.variables)]);
  if (f.assumptions) pdf.p(`Assumptions: ${f.assumptions}`, { muted: true, size: 9 });
  if (f.conventions) pdf.p(`Conventions: ${f.conventions}`, { muted: true, size: 9 });
  const ex = f.example as { problem?: string; steps?: string[]; answer?: string } | null;
  if (withExample && ex?.problem) {
    pdf.p(`Example: ${ex.problem}`, { size: 9.5 });
    if (ex.steps?.length) pdf.bullets(ex.steps, "num");
    if (ex.answer) pdf.p(`Answer: ${ex.answer}`, { size: 9.5 });
  }
  if (f.mistakes.length) pdf.p(`Common mistakes: ${f.mistakes.join(" · ")}`, { muted: true, size: 9 });
}

function writeLesson(pdf: Pdf, title: string, c: LessonContent, formulas: FormulaRow[]) {
  pdf.h2("Learning objectives").bullets(c.objectives);
  if (c.prerequisites.length) pdf.h2("Before you start").bullets(c.prerequisites);
  pdf.h2("Intuition").p(c.explanations.beginner);
  pdf.h2("Explanation").p(c.explanations.intermediate);
  pdf.h2("Going deeper").p(c.explanations.advanced);
  pdf.h2("Formal definition").p(c.formal);
  if (c.table) pdf.h3(c.table.caption).table(c.table.headers, c.table.rows);
  if (c.journalEntries?.length) {
    pdf.h2("Journal entries");
    for (const j of c.journalEntries) pdf.h3(j.description).table(["Account", "Debit", "Credit"], j.lines.map((l) => [l.account, l.debit ?? "", l.credit ?? ""]), [260, 110, 113]);
  }
  if (formulas.length) {
    pdf.h2("Key formulas");
    formulas.forEach((f) => writeFormula(pdf, f, false));
  }
  for (const [i, ex] of c.workedExamples.entries()) {
    pdf.h2(`Worked example ${i + 1}: ${ex.title}`).p(ex.problem).bullets(ex.steps, "num").box("Answer", [ex.answer], "red");
  }
  if (c.applications.length) pdf.h2("Real-world applications").bullets(c.applications);
  if (c.examExamples.length) {
    pdf.h2("How it is examined");
    for (const e of c.examExamples) pdf.p(e.prompt, { italic: true }).p(`→ ${e.insight}`);
  }
  if (c.misconceptions.length) {
    pdf.h2("Common traps");
    for (const m of c.misconceptions) pdf.p(`✗ ${m.myth}`).p(`✓ ${m.reality}`, { muted: true });
  }
  pdf.h2("Summary").box("Remember", c.summary.map((s) => `• ${s}`), "green");
  if (c.references.length) {
    pdf.h2("References");
    for (const r of c.references) {
      pdf.p(`${r.title} — ${r.publisher}${r.note ? ` (${r.note})` : ""}`, { size: 9, muted: true });
      if (r.url) pdf.link(r.url, r.url);
    }
  }
  void title;
}

export async function lessonPdf(lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, status: "PUBLISHED" },
    include: { topic: { include: { parent: true, syllabus: { include: { level: { include: { program: true } } } } } } },
  });
  if (!lesson) return null;
  const c = lessonContentSchema.parse(lesson.content);
  const formulas = await prisma.formula.findMany({ where: { slug: { in: c.formulaSlugs } } });
  const lvl = lesson.topic.syllabus.level;
  const pdf = new Pdf({
    title: lesson.title,
    kicker: `${lvl.program.shortName} ${lvl.name} · ${lesson.topic.parent?.name ?? lesson.topic.name}`,
    subtitle: `Lesson notes · about ${lesson.estimatedMinutes} minutes · ${lesson.topic.syllabus.versionLabel}. Educational explanation — not official curriculum text.`,
  });
  writeLesson(pdf, lesson.title, c, formulas);
  return { buf: await pdf.finish(), filename: `pd-finprep-${lesson.slug}.pdf` };
}

export async function formulaSheetPdf(syllabusVersionId?: string) {
  const sv = syllabusVersionId
    ? await prisma.syllabusVersion.findUnique({ where: { id: syllabusVersionId }, include: { level: { include: { program: true } } } })
    : null;
  const formulas = await prisma.formula.findMany({
    where: sv ? { topics: { some: { topic: { syllabusVersionId: sv.id } } } } : {},
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const pdf = new Pdf({
    title: sv ? `${sv.level.program.shortName} ${sv.level.name} formula sheet` : "Formula sheet",
    kicker: "PD FinPrep · Formula library",
    subtitle: `${formulas.length} formulas with variables, assumptions and worked examples. Check your exam's calculator and formula-sheet policy.`,
  });
  let cat = "";
  for (const f of formulas) {
    if (f.category !== cat) {
      cat = f.category;
      pdf.h2(cat);
    }
    writeFormula(pdf, f);
  }
  if (!formulas.length) pdf.p("No formulas are linked to this syllabus yet.");
  const name = sv ? `${sv.level.program.shortName}-${sv.level.code}` : "all";
  return { buf: await pdf.finish(), filename: `pd-finprep-formulas-${name}.pdf` };
}

export async function examGuidePdf(levelId: string) {
  const level = await getGuideLevel(levelId);
  if (!level) return null;
  const info = level.info;
  const pdf = new Pdf({
    title: `${level.program.shortName} ${level.name}`,
    kicker: `${level.program.awardingBody} · Exam fact sheet`,
    subtitle: info ? `Dates, fees, format and difficulty as of ${info.asOf}. Facts change — always confirm on the official website before registering or paying.` : "Exam fact sheet",
  });
  if (!info) {
    pdf.p("Dates and fees for this level have not been added yet. Please check the official website.");
  } else {
    pdf.h2("Format").p(info.format + (info.delivery ? ` · ${info.delivery}` : ""));
    if (info.passingStandard) pdf.p(`Passing standard: ${info.passingStandard}`);
    pdf.h2("Upcoming dates");
    if (info.upcoming.length) pdf.table(["Window", "Dates", "Registration"], info.upcoming.map((u) => [u.label, u.dates, [u.registration, u.deadline ? `Deadline ${u.deadline}` : ""].filter(Boolean).join(" · ")]), [130, 150, 203]);
    else pdf.p("Not announced yet.");
    pdf.h2("Fees");
    if (info.fees.length) pdf.table(["Item", "Amount", "Note"], info.fees.map((f) => [f.label, f.amount, f.note ?? ""]), [190, 110, 183]);
    if (info.feeNote) pdf.p(info.feeNote, { muted: true, size: 9 });
    pdf.h2("Difficulty");
    pdf.box("Editorial rating", [`${"■".repeat(info.difficulty)}${"□".repeat(5 - info.difficulty)}  ${DIFFICULTY_LABEL[info.difficulty]} (${info.difficulty}/5)`], info.difficulty >= 4 ? "red" : "green");
    pdf.p(info.difficultyNote);
    if (info.passRate) pdf.p(`Pass rate: ${info.passRate.value} (${info.passRate.period}; ${info.passRate.official ? "published by the examining body" : "reported, not official"}).`);
    if (info.studyHours) pdf.p(`Typical study time: ${info.studyHours}.`);
    if (info.notes.length) pdf.h2("Notes").bullets(info.notes);
    pdf.h2("Official links");
    pdf.link(`Official site: ${info.officialUrl}`, info.officialUrl);
    if (info.registrationUrl) pdf.link(`Registration: ${info.registrationUrl}`, info.registrationUrl);
    pdf.h2("Sources");
    for (const s of info.sources) pdf.link(s.title, s.url);
    pdf.p(info.verified ? "Verified by a PD FinPrep administrator." : "Not yet verified by a PD FinPrep administrator.", { muted: true, size: 9 });
  }
  return { buf: await pdf.finish(), filename: `pd-finprep-${level.program.slug}-${level.code}-exam-facts.pdf` };
}

/** Every published lesson of a syllabus plus its formula sheet in one study pack. */
export async function studyPackPdf(syllabusVersionId: string, topicId?: string) {
  const sv = await prisma.syllabusVersion.findUnique({ where: { id: syllabusVersionId }, include: { level: { include: { program: true } } } });
  if (!sv) return null;
  const topics = await prisma.topic.findMany({
    where: { syllabusVersionId, parentId: null, ...(topicId ? { id: topicId } : {}) },
    orderBy: { order: "asc" },
    include: {
      lessons: { where: { status: "PUBLISHED" }, orderBy: { title: "asc" } },
      children: { orderBy: { order: "asc" }, include: { lessons: { where: { status: "PUBLISHED" }, orderBy: { title: "asc" } } } },
    },
  });
  if (topicId && !topics.length) return null;
  const lessons = topics.flatMap((t) => [...t.lessons.map((l) => ({ topic: t.name, l })), ...t.children.flatMap((c) => c.lessons.map((l) => ({ topic: `${t.name} · ${c.name}`, l })))]);
  const title = topicId ? `${topics[0].name} study pack` : `${sv.level.program.shortName} ${sv.level.name} study pack`;
  const pdf = new Pdf({
    title,
    kicker: `${sv.level.program.shortName} ${sv.level.name} · ${sv.versionLabel}`,
    subtitle: `${lessons.length} lesson${lessons.length === 1 ? "" : "s"} with worked examples, traps and summaries. Educational material — use the official curriculum as the authoritative source.`,
  });
  pdf.h2("Contents");
  if (lessons.length) pdf.table(["#", "Lesson", "Topic", "Time"], lessons.map(({ topic, l }, i) => [String(i + 1), l.title, topic, `${l.estimatedMinutes} min`]), [30, 210, 183, 60]);
  else pdf.p("No published lessons are available for this selection yet.");
  const slugs = new Set<string>();
  const parsed = lessons.map(({ topic, l }) => {
    const c = lessonContentSchema.parse(l.content);
    c.formulaSlugs.forEach((s) => slugs.add(s));
    return { topic, l, c };
  });
  const formulas = await prisma.formula.findMany({ where: { slug: { in: [...slugs] } } });
  const bySlug = new Map(formulas.map((f) => [f.slug, f]));
  for (const [i, { topic, l, c }] of parsed.entries()) {
    pdf.newPage();
    pdf.h2(`${i + 1}. ${l.title}`).p(topic, { muted: true, size: 9 });
    writeLesson(pdf, l.title, c, c.formulaSlugs.map((s) => bySlug.get(s)).filter((f): f is NonNullable<typeof f> => !!f));
  }
  if (formulas.length) {
    pdf.newPage().h2("Formula sheet");
    formulas.forEach((f) => writeFormula(pdf, f, false));
  }
  const name = topicId ? topics[0].name : `${sv.level.program.shortName}-${sv.level.code}`;
  return { buf: await pdf.finish(), filename: `pd-finprep-${name}-study-pack.pdf` };
}
