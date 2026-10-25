import { withUser } from "@/server/api";
import { formulaSheetPdf } from "@/server/materials/builders";
import { pdfResponse } from "@/server/materials/pdf";

export const runtime = "nodejs";

export const GET = withUser(async ({ req }) => {
  const syllabus = req.nextUrl.searchParams.get("syllabus") ?? undefined;
  const r = await formulaSheetPdf(syllabus);
  return pdfResponse(r.buf, r.filename);
});
