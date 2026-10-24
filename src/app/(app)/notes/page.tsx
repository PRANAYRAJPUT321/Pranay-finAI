import Link from "next/link";
import { Badge, Card, CardTitle, EmptyState, PageHeader, TabLinks, fmtDate } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { NoteForm } from "@/components/note-form";
import { NoteEdit } from "@/components/note-edit";
import { requireUser } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { bookmarkAction, deleteNoteAction, toggleHighlightAction } from "@/app/actions/content";

export const metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "notebook" || sp.tab === "bookmarks" ? sp.tab : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const [notes, bookmarks] = await Promise.all([
    prisma.note.findMany({
      where: { userId: user.id, ...(tab === "notebook" ? { highlight: true } : {}), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}) },
      orderBy: { updatedAt: "desc" },
      include: { lesson: { select: { id: true, title: true } }, formula: { select: { slug: true, name: true } }, topic: { select: { name: true } } },
    }),
    tab === "bookmarks"
      ? prisma.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { lesson: { select: { id: true, title: true } }, formula: { select: { id: true, slug: true, name: true, expression: true } }, question: { select: { id: true, stem: true } } } })
      : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title="Notes and revision notebook" description="Your notes, pinned formulas and bookmarked material in one place." />
      <TabLinks active={tab} tabs={[{ key: "all", label: "All notes", href: "/notes" }, { key: "notebook", label: "Revision notebook", href: "/notes?tab=notebook" }, { key: "bookmarks", label: "Bookmarks", href: "/notes?tab=bookmarks" }]} />
      {tab === "bookmarks" ? (
        bookmarks.length === 0 ? <EmptyState title="No bookmarks yet" description="Bookmark lessons and formulas to find them here." /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {bookmarks.map((b) => (
              <Card key={b.id} className="p-4">
                {b.lesson && <><Badge tone="navy">Lesson</Badge><Link href={`/learn/${b.lesson.id}`} className="mt-1 block font-medium text-navy-800 underline">{b.lesson.title}</Link></>}
                {b.formula && <><Badge tone="blue">Formula</Badge><Link href={`/formulas/${b.formula.slug}`} className="mt-1 block font-medium text-navy-800 underline">{b.formula.name}</Link><p className="formula mt-1 text-xs">{b.formula.expression}</p></>}
                {b.question && <><Badge>Question</Badge><p className="mt-1 text-sm">{b.question.stem.slice(0, 160)}</p></>}
                <form action={bookmarkAction.bind(null, { lessonId: b.lessonId ?? undefined, formulaId: b.formulaId ?? undefined, questionId: b.questionId ?? undefined }, "/notes")} className="mt-2"><SubmitButton size="sm" variant="ghost">Remove</SubmitButton></form>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <form role="search" className="flex gap-2"><label htmlFor="nq" className="sr-only">Search notes</label><input id="nq" name="q" defaultValue={q} placeholder="Search notes" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />{tab === "notebook" && <input type="hidden" name="tab" value="notebook" />}<SubmitButton size="sm" variant="secondary">Search</SubmitButton></form>
            {notes.length === 0 ? <EmptyState title={tab === "notebook" ? "Nothing pinned yet" : "No notes yet"} description="Add notes from lessons and formula pages, or write one here." /> : notes.map((n) => (
              <Card key={n.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy-900">{n.title} {n.highlight && <Badge tone="gold">Pinned</Badge>}</p>
                    <p className="text-xs text-slate-500">{fmtDate(n.updatedAt)}{n.topic ? ` · ${n.topic.name}` : ""}{n.lesson ? <> · <Link className="underline" href={`/learn/${n.lesson.id}`}>{n.lesson.title}</Link></> : null}{n.formula ? <> · <Link className="underline" href={`/formulas/${n.formula.slug}`}>{n.formula.name}</Link></> : null}</p>
                  </div>
                  <div className="flex gap-1">
                    <form action={toggleHighlightAction.bind(null, n.id)}><SubmitButton size="sm" variant="ghost">{n.highlight ? "Unpin" : "Pin"}</SubmitButton></form>
                    <form action={deleteNoteAction.bind(null, n.id)}><SubmitButton size="sm" variant="ghost">Delete</SubmitButton></form>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{n.body}</p>
                <NoteEdit note={n} />
              </Card>
            ))}
          </div>
          <Card>
            <CardTitle>New note</CardTitle>
            <NoteForm path="/notes" />
          </Card>
        </div>
      )}
    </>
  );
}
