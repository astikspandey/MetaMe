import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFPage, PDFFont, RGB, rgb, StandardFonts } from 'pdf-lib';

const PRIMARY = rgb(0.447, 0.627, 0.757); // #72A0C1
const PRIMARY_DARK = rgb(0.243, 0.38, 0.494); // darker tint for headings on white
const ACCENT = rgb(0.616, 0.765, 0.902); // #9DC3E6
const TEXT_DARK = rgb(0.15, 0.17, 0.2);
const WHITE = rgb(1, 1, 1);

const PAGE_MARGIN = 50;
const BOTTOM_MARGIN = 50;

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1');
}

class PdfWriter {
  private doc: PDFDocument;
  private font: PDFFont;
  private boldFont: PDFFont;
  page!: PDFPage;
  width = 0;
  height = 0;
  y = 0;
  readonly leftMargin = PAGE_MARGIN;
  contentWidth = 0;

  constructor(doc: PDFDocument, font: PDFFont, boldFont: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.boldFont = boldFont;
    this.addPage();
  }

  addPage() {
    this.page = this.doc.addPage();
    const { width, height } = this.page.getSize();
    this.width = width;
    this.height = height;
    this.contentWidth = width - PAGE_MARGIN * 2;
    this.y = height - PAGE_MARGIN;
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < BOTTOM_MARGIN) {
      this.addPage();
    }
  }

  private getFont(bold: boolean) {
    return bold ? this.boldFont : this.font;
  }

  text(str: string, opts: { size: number; bold?: boolean; color?: RGB; x?: number }) {
    this.ensureSpace(opts.size * 1.4);
    this.page.drawText(str, {
      x: opts.x ?? this.leftMargin,
      y: this.y,
      size: opts.size,
      font: this.getFont(!!opts.bold),
      color: opts.color ?? TEXT_DARK,
    });
    this.y -= opts.size * 1.4;
  }

  wrapped(str: string, opts: { size: number; bold?: boolean; color?: RGB; x?: number; maxWidth?: number; lineHeight?: number }) {
    const font = this.getFont(!!opts.bold);
    const x = opts.x ?? this.leftMargin;
    const maxWidth = opts.maxWidth ?? this.contentWidth - (x - this.leftMargin);
    const lineHeight = opts.size * (opts.lineHeight ?? 1.45);
    const words = str.split(/\s+/).filter(Boolean);
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, opts.size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (const l of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(l, { x, y: this.y, size: opts.size, font, color: opts.color ?? TEXT_DARK });
      this.y -= lineHeight;
    }
  }

  gap(amount: number) {
    this.y -= amount;
  }

  sectionHeading(title: string) {
    this.ensureSpace(30);
    this.text(title.toUpperCase(), { size: 12, bold: true, color: PRIMARY_DARK });
    this.page.drawLine({
      start: { x: this.leftMargin, y: this.y + 4 },
      end: { x: this.leftMargin + 28, y: this.y + 4 },
      thickness: 2,
      color: ACCENT,
    });
    this.y -= 6;
  }

  chips(items: string[]) {
    const size = 10;
    const paddingX = 8;
    const paddingY = 5;
    const gapX = 6;
    const gapY = 8;
    const rowHeight = size + paddingY * 2;
    let x = this.leftMargin;
    this.ensureSpace(rowHeight);
    for (const item of items) {
      const textWidth = this.font.widthOfTextAtSize(item, size);
      const chipWidth = textWidth + paddingX * 2;
      if (x + chipWidth > this.leftMargin + this.contentWidth) {
        x = this.leftMargin;
        this.y -= rowHeight + gapY;
        this.ensureSpace(rowHeight);
      }
      this.page.drawRectangle({
        x,
        y: this.y - rowHeight + paddingY - 2,
        width: chipWidth,
        height: rowHeight,
        color: ACCENT,
        opacity: 0.35,
        borderColor: PRIMARY,
        borderWidth: 0.5,
      });
      this.page.drawText(item, {
        x: x + paddingX,
        y: this.y - rowHeight + paddingY + 1,
        size,
        font: this.font,
        color: PRIMARY_DARK,
      });
      x += chipWidth + gapX;
    }
    this.y -= rowHeight + gapY;
  }

  markdownBody(markdown: string, opts: { size: number; color?: RGB }) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        this.gap(opts.size * 0.6);
        continue;
      }
      const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headSize = level === 1 ? opts.size + 6 : level === 2 ? opts.size + 3 : opts.size + 1;
        this.gap(6);
        this.wrapped(stripMarkdownInline(headingMatch[2]), { size: headSize, bold: true, color: TEXT_DARK, lineHeight: 1.3 });
        this.gap(4);
        continue;
      }
      const bulletMatch = line.match(/^[-*]\s+(.*)/);
      if (bulletMatch) {
        this.wrapped(`•  ${stripMarkdownInline(bulletMatch[1])}`, {
          size: opts.size,
          color: opts.color,
          x: this.leftMargin + 8,
          maxWidth: this.contentWidth - 8,
        });
        continue;
      }
      this.wrapped(stripMarkdownInline(line), { size: opts.size, color: opts.color });
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'N/A';
  const headline = searchParams.get('headline') || '';
  const content = searchParams.get('content') || '';
  const interests = searchParams.get('interests') || '';
  const skills = searchParams.get('skills') || '';
  const imageUrl = searchParams.get('imageUrl');

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const w = new PdfWriter(pdfDoc, font, boldFont);

    const bannerHeight = 130;
    w.page.drawRectangle({ x: 0, y: w.height - bannerHeight, width: w.width, height: bannerHeight, color: PRIMARY });

    let textX = w.leftMargin;

    if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
        } else {
          const imageBytes = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get('content-type');

          let pdfImage;
          if (contentType === 'image/png') {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          } else if (contentType === 'image/jpeg') {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          } else {
            console.warn(`Unsupported image type: ${contentType} from ${imageUrl}`);
          }

          if (pdfImage) {
            const avatarSize = 78;
            const imgX = w.leftMargin;
            const imgY = w.height - bannerHeight + (bannerHeight - avatarSize) / 2;
            w.page.drawRectangle({
              x: imgX - 3,
              y: imgY - 3,
              width: avatarSize + 6,
              height: avatarSize + 6,
              color: WHITE,
            });
            w.page.drawImage(pdfImage, { x: imgX, y: imgY, width: avatarSize, height: avatarSize });
            textX = imgX + avatarSize + 22;
          }
        }
      } catch (e) {
        console.error('Error processing image for PDF:', e);
      }
    }

    const nameY = w.height - bannerHeight / 2 + (headline ? 8 : -4);
    w.page.drawText(name, { x: textX, y: nameY, size: 24, font: boldFont, color: WHITE });
    if (headline) {
      w.page.drawText(headline, { x: textX, y: nameY - 24, size: 13, font, color: rgb(0.95, 0.97, 1) });
    }

    w.y = w.height - bannerHeight - 36;

    if (content) {
      w.sectionHeading('About Me');
      w.markdownBody(content, { size: 11, color: TEXT_DARK });
      w.gap(20);
    }

    if (interests) {
      w.sectionHeading('Interests');
      w.chips(interests.split(',').map((i) => i.trim()).filter(Boolean));
      w.gap(12);
    }

    if (skills) {
      w.sectionHeading('Skills');
      w.chips(skills.split(',').map((s) => s.trim()).filter(Boolean));
    }

    const pdfBytes = await pdfDoc.save();
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'profile';

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="profile-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return new NextResponse('Failed to generate PDF.', { status: 500 });
  }
}
