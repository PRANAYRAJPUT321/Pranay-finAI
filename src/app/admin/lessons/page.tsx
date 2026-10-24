import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { prisma } from "@/server/db";

export const metadata = { title: "Lessons · Admin" };

export default async function AdminLessons() {
  const lessons = await prisma.lesson.findMany({ orderBy: { updatedAt: "desc" }, include: { topic: { include: { syllabus: { include: { level: { include: { program: true } } } } } }, _count: { select: { reports: { where: { status: "open" } } } } } });
  return (
    <>
      <PageHeader title="Lessons" description="Structured lesson content. AI-generated lessons must be reviewed before publishing; edits to published AI-generated lessons return them to review." />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2 font-medium">Lesson</th><th className="p-2 font-medium">Exam / topic</th><th className="p-2 font-medium">Status</th><th className="p-2 font-medium">Version</th><th className="p-2 font-medium">Reports</th></tr></thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-2"><Link className="text-navy-800 underline" href={`/admin/lessons/${l.id}`}>{l.title}</Link></td>
                <td className="p-2 text-xs">{l.topic.syllabus.level.program.shortName} {l.topic.syllabus.level.name} · {l.topic.name}</td>
                <td className="p-2"><Badge tone={l.status === "PUBLISHED" ? "green" : "amber"}>{l.status.toLowerCase()}</Badge> <Badge>{l.origin.toLowerCase()}</Badge></td>
                <td className="p-2">v{l.version}</td>
                <td className="p-2">{l._count.reports || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
