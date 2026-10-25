import { withUser, ApiError } from "@/server/api";
import { lessonPdf } from "@/server/materials/builders";
import { pdfResponse } from "@/server/materials/pdf";

export const runtime = "nodejs";

export const GET = withUser<{ id: string }>(async ({ params }) => {
  const r = await lessonPdf(params.id);
  if (!r) throw new ApiError("Lesson not found", 404);
  return pdfResponse(r.buf, r.filename);
});
