import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

/**
 * Small PDF toolkit on top of pdfkit with the brand look (green-black, red, white)
 * and bundled DejaVu fonts so symbols such as σ, ×, −, ≥ and ₹ render correctly.
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const F = {
  sans: path.join(FONT_DIR, "DejaVuSans.ttf"),
  bold: path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
  italic: path.join(FONT_DIR, "DejaVuSans-Oblique.ttf"),
  serif: path.join(FONT_DIR, "DejaVuSerif-Bold.ttf"),
  mono: path.join(FONT_DIR, "DejaVuSansMono.ttf"),
};

const INK = "#070f0c";
const GREEN = "#0e211c";
const MINT = "#3a856c";
const RED = "#e3262e";
const TEXT = "#1f2a26";
const MUTED = "#5b6b65";
const LINE = "#d9e1dd";

const MARGIN = 56;

export class Pdf {
  readonly doc: PDFKit.PDFDocument;
  private chunks: Buffer[] = [];
  private done: Promise<Buffer>;

  constructor(private meta: { title: string; subtitle?: string; kicker?: string }) {
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN + 10, left: MARGIN, right: MARGIN },
      bufferPages: true,
      font: F.sans,
      info: { Title: meta.title, Author: "PD FinPrep", Subject: meta.subtitle ?? "Study material", Creator: "PD FinPrep" },
    });
    this.doc.registerFont("sans", F.sans);
    this.doc.registerFont("bold", F.bold);
    this.doc.registerFont("italic", F.italic);
    this.doc.registerFont("serif", F.serif);
    this.doc.registerFont("mono", F.mono);
    this.done = new Promise((resolve, reject) => {
      this.doc.on("data", (c: Buffer) => this.chunks.push(c));
      this.doc.on("end", () => resolve(Buffer.concat(this.chunks)));
      this.doc.on("error", reject);
    });
    this.cover();
  }

  private get width() {
    return this.doc.page.width - MARGIN * 2;
  }

  private cover() {
    const d = this.doc;
    const h = 190;
    d.save().rect(0, 0, d.page.width, h).fill(INK).restore();
    // red beam
    d.save().opacity(0.35).polygon([d.page.width * 0.68, 0], [d.page.width * 0.8, 0], [d.page.width * 0.62, h], [d.page.width * 0.5, h]).fill(RED).restore();
    d.font("bold").fontSize(8).fillColor("#8fd3bb").text((this.meta.kicker ?? "PD FinPrep · Study material").toUpperCase(), MARGIN, 44, { characterSpacing: 2.5, width: this.width });
    d.font("serif").fontSize(26).fillColor("#ffffff").text(this.meta.title.toUpperCase(), MARGIN, 66, { width: this.width - 40, lineGap: -2 });
    d.save().rect(MARGIN, d.y + 8, 40, 2).fill(RED).restore();
    if (this.meta.subtitle) d.font("sans").fontSize(10).fillColor("#cfe0d9").text(this.meta.subtitle, MARGIN, d.y + 18, { width: this.width });
    d.y = h + 28;
    d.x = MARGIN;
    d.fillColor(TEXT);
  }

  private ensure(space: number) {
    if (this.doc.y + space > this.doc.page.height - this.doc.page.margins.bottom) this.doc.addPage();
  }

  h2(text: string) {
    this.ensure(60);
    const d = this.doc;
    d.moveDown(0.6);
    d.save().rect(MARGIN, d.y + 3, 3, 14).fill(RED).restore();
    d.font("serif").fontSize(14).fillColor(GREEN).text(text, MARGIN + 10, d.y, { width: this.width - 10 });
    d.x = MARGIN;
    d.moveDown(0.35);
    return this;
  }

  h3(text: string) {
    this.ensure(40);
    this.doc.moveDown(0.3).font("bold").fontSize(10.5).fillColor(INK).text(text, MARGIN, this.doc.y, { width: this.width });
    this.doc.moveDown(0.15);
    return this;
  }

  p(text: string, opts: { muted?: boolean; italic?: boolean; size?: number } = {}) {
    if (!text) return this;
    this.ensure(30);
    for (const para of text.split(/\n{2,}/)) {
      this.doc.font(opts.italic ? "italic" : "sans").fontSize(opts.size ?? 10).fillColor(opts.muted ? MUTED : TEXT).text(para.replace(/\n/g, " ").trim(), MARGIN, this.doc.y, { width: this.width, lineGap: 2.5, align: "left" });
      this.doc.moveDown(0.45);
    }
    return this;
  }

  bullets(items: string[], marker: "dot" | "num" = "dot") {
    items.forEach((t, i) => {
      this.ensure(24);
      const y = this.doc.y;
      if (marker === "num") this.doc.font("bold").fontSize(9.5).fillColor(RED).text(`${i + 1}.`, MARGIN, y, { width: 18 });
      else this.doc.save().circle(MARGIN + 4, y + 6, 1.8).fill(RED).restore();
      this.doc.font("sans").fontSize(10).fillColor(TEXT).text(t, MARGIN + 16, y, { width: this.width - 16, lineGap: 2 });
      this.doc.moveDown(0.25);
    });
    this.doc.x = MARGIN;
    return this;
  }

  /** Highlighted box, e.g. for formulas or key takeaways. */
  box(title: string, lines: string[], tone: "green" | "red" = "green") {
    const d = this.doc;
    d.font("mono").fontSize(10);
    const inner = this.width - 24;
    const bodyH = lines.reduce((a, l) => a + d.heightOfString(l, { width: inner, lineGap: 2 }) + 4, 0);
    const h = bodyH + 34;
    this.ensure(h + 10);
    const y = d.y + 4;
    d.save().roundedRect(MARGIN, y, this.width, h, 6).fill(tone === "green" ? "#effaf6" : "#fff1f1").restore();
    d.save().rect(MARGIN, y, 3, h).fill(tone === "green" ? MINT : RED).restore();
    d.font("bold").fontSize(8).fillColor(tone === "green" ? MINT : RED).text(title.toUpperCase(), MARGIN + 14, y + 10, { characterSpacing: 1.5, width: inner });
    let cy = y + 26;
    for (const l of lines) {
      d.font("mono").fontSize(10).fillColor(INK).text(l, MARGIN + 14, cy, { width: inner, lineGap: 2 });
      cy = d.y + 4;
    }
    d.y = y + h + 8;
    d.x = MARGIN;
    return this;
  }

  table(headers: string[], rows: string[][], widths?: number[]) {
    const d = this.doc;
    const w = widths ?? headers.map(() => this.width / headers.length);
    const rowH = (cells: string[], font: string) => {
      d.font(font).fontSize(9);
      return Math.max(...cells.map((c, i) => d.heightOfString(c ?? "", { width: w[i] - 10 }))) + 10;
    };
    const drawRow = (cells: string[], header: boolean) => {
      const h = rowH(cells, header ? "bold" : "sans");
      this.ensure(h + 4);
      const y = d.y;
      if (header) d.save().rect(MARGIN, y, this.width, h).fill(GREEN).restore();
      let x = MARGIN;
      cells.forEach((c, i) => {
        d.font(header ? "bold" : "sans").fontSize(9).fillColor(header ? "#ffffff" : TEXT).text(c ?? "", x + 5, y + 5, { width: w[i] - 10 });
        x += w[i];
      });
      d.save().moveTo(MARGIN, y + h).lineTo(MARGIN + this.width, y + h).lineWidth(0.5).strokeColor(LINE).stroke().restore();
      d.y = y + h;
    };
    drawRow(headers, true);
    rows.forEach((r) => drawRow(r, false));
    d.moveDown(0.6);
    d.x = MARGIN;
    return this;
  }

  link(label: string, url: string) {
    this.ensure(20);
    this.doc.font("sans").fontSize(9).fillColor(MINT).text(label, MARGIN, this.doc.y, { width: this.width, link: url, underline: true });
    this.doc.fillColor(TEXT);
    return this;
  }

  rule() {
    this.ensure(16);
    const y = this.doc.y + 6;
    this.doc.save().moveTo(MARGIN, y).lineTo(MARGIN + this.width, y).lineWidth(0.5).strokeColor(LINE).stroke().restore();
    this.doc.y = y + 10;
    return this;
  }

  newPage() {
    this.doc.addPage();
    return this;
  }

  /** Adds page footers and returns the finished file. */
  async finish(): Promise<Buffer> {
    const d = this.doc;
    const range = d.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      d.switchToPage(i);
      const y = d.page.height - 40;
      d.save().moveTo(MARGIN, y - 6).lineTo(d.page.width - MARGIN, y - 6).lineWidth(0.5).strokeColor(LINE).stroke().restore();
      d.font("sans").fontSize(7).fillColor(MUTED);
      d.text("PD FinPrep · Unofficial study material — not affiliated with any examination body. Confirm facts with official sources.", MARGIN, y, { width: this.width - 50, lineBreak: false, height: 10 });
      d.text(`${i + 1} / ${range.count}`, d.page.width - MARGIN - 40, y, { width: 40, align: "right", lineBreak: false, height: 10 });
    }
    d.end();
    return this.done;
  }
}

export function pdfResponse(buf: Buffer, filename: string) {
  const safe = filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safe}"`,
      "cache-control": "private, max-age=300",
    },
  });
}
