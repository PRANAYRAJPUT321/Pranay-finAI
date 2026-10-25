import { NextResponse } from "next/server";
import { examGuidePdf } from "@/server/materials/builders";
import { pdfResponse } from "@/server/materials/pdf";

export const runtime = "nodejs";

/** Public: exam fact sheets contain only published, sourced information. */
export async function GET(_req: Request, ctx: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await ctx.params;
  try {
    const r = await examGuidePdf(levelId);
    if (!r) return NextResponse.json({ error: "Level not found" }, { status: 404 });
    return pdfResponse(r.buf, r.filename);
  } catch (e) {
    console.error("[materials] exam guide pdf failed", e);
    return NextResponse.json({ error: "Could not generate the PDF" }, { status: 500 });
  }
}
