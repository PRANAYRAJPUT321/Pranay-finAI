import { withUser, ApiError } from "@/server/api";
import { studyPackPdf } from "@/server/materials/builders";
import { pdfResponse } from "@/server/materials/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withUser<{ syllabusId: string }>(async ({ req, params }) => {
  const topic = req.nextUrl.searchParams.get("topic") ?? undefined;
  const r = await studyPackPdf(params.syllabusId, topic);
  if (!r) throw new ApiError("Syllabus or topic not found", 404);
  return pdfResponse(r.buf, r.filename);
});
