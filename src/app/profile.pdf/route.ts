
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'N/A';
  const headline = searchParams.get('headline') || '';
  const content = searchParams.get('content') || '';
  const interests = searchParams.get('interests') || '';
  const skills = searchParams.get('skills') || '';

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const lineHeight = 18;
    const sectionSpacing = 20;

    // Function to draw text and handle basic wrapping
    const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, currentFont: any, textColor: any) => {
      const lines = [];
      let currentLine = '';
      const words = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/ |\n/);

      for (const word of words) {
        if (word.includes('\n')) {
          const parts = word.split('\n');
          for (let i = 0; i < parts.length; i++) {
            const testLinePartial = currentLine + (currentLine ? ' ' : '') + parts[i];
            if (currentFont.widthOfTextAtSize(testLinePartial, fontSize) > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = parts[i];
            } else {
              currentLine = testLinePartial;
            }
            if (i < parts.length - 1) { // Newline character was present
              lines.push(currentLine);
              currentLine = '';
            }
          }
        } else {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (currentFont.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      }
      lines.push(currentLine); // Add the last line

      for (const line of lines) {
        if (y < 50) { // Crude pagination, ideally add new page
            // For simplicity, we'll just stop rendering if out of space.
            // A real implementation would add a new page.
            return y; 
        }
        page.drawText(line, { x, y, font: currentFont, size: fontSize, color: textColor });
        y -= lineHeight * (fontSize / 12); // Adjust line height based on font size
      }
      return y;
    };
    
    // Name
    yPosition = drawWrappedText(name, leftMargin, yPosition, rightMargin - leftMargin, 24, boldFont, rgb(0.1, 0.1, 0.1));
    yPosition -= sectionSpacing / 2;

    // Headline
    if (headline) {
      yPosition = drawWrappedText(headline, leftMargin, yPosition, rightMargin - leftMargin, 16, font, rgb(0.3, 0.3, 0.3));
      yPosition -= sectionSpacing;
    }
    
    // Horizontal Line
    page.drawLine({
        start: { x: leftMargin, y: yPosition },
        end: { x: rightMargin, y: yPosition },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
    });
    yPosition -= sectionSpacing;


    // Content
    if (content) {
      page.drawText('About Me', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= lineHeight * 1.2;
      yPosition = drawWrappedText(content, leftMargin, yPosition, rightMargin - leftMargin, 11, font, rgb(0.2, 0.2, 0.2));
      yPosition -= sectionSpacing;
    }

    // Interests
    if (interests) {
      page.drawText('Interests', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= lineHeight * 1.2;
      yPosition = drawWrappedText(interests.split(',').map(i => `• ${i.trim()}`).join('\n'), leftMargin, yPosition, rightMargin - leftMargin, 11, font, rgb(0.2, 0.2, 0.2));
      yPosition -= sectionSpacing;
    }

    // Skills
    if (skills) {
      page.drawText('Skills', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= lineHeight * 1.2;
      yPosition = drawWrappedText(skills.split(',').map(s => `• ${s.trim()}`).join('\n'), leftMargin, yPosition, rightMargin - leftMargin, 11, font, rgb(0.2, 0.2, 0.2));
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="profile-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return new NextResponse('Failed to generate PDF.', { status: 500 });
  }
}
