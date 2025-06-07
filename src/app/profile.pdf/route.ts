
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';

async function drawWrappedText(
    page: import('pdf-lib').PDFPage, 
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    fontSize: number, 
    font: PDFFont, 
    textColor: import('pdf-lib').RGB,
    lineHeightAdjustment: number = 1.5 // Default line height factor
  ): Promise<number> {
  const lines = [];
  let currentLine = '';
  const words = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/ |\n/);

  for (const word of words) {
    if (word.includes('\n')) {
      const parts = word.split('\n');
      for (let i = 0; i < parts.length; i++) {
        const testLinePartial = currentLine + (currentLine ? ' ' : '') + parts[i];
        if (font.widthOfTextAtSize(testLinePartial, fontSize) > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = parts[i];
        } else {
          currentLine = testLinePartial;
        }
        if (i < parts.length - 1) {
          lines.push(currentLine);
          currentLine = '';
        }
      }
    } else {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
  }
  lines.push(currentLine);

  const effectiveLineHeight = fontSize * lineHeightAdjustment;

  for (const line of lines) {
    if (y < 50) { // Basic check to prevent writing off-page
      return y;
    }
    page.drawText(line, { x, y, font, size: fontSize, color: textColor });
    y -= effectiveLineHeight;
  }
  return y;
};

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
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const contentWidth = rightMargin - leftMargin;
    const sectionSpacing = 20;
    const baseLineHeight = 18; // For 12pt font

    // Try to add image if imageUrl is provided and is a public URL
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
            const aspectRatio = pdfImage.width / pdfImage.height;
            let imgWidth = 100; 
            let imgHeight = imgWidth / aspectRatio;

            if (imgHeight > 150) { // Max height for image
                imgHeight = 150;
                imgWidth = imgHeight * aspectRatio;
            }
            if (imgWidth > contentWidth) {
                imgWidth = contentWidth;
                imgHeight = imgWidth / aspectRatio;
            }
            
            // Center image horizontally
            const imgX = leftMargin + (contentWidth - imgWidth) / 2;
            
            page.drawImage(pdfImage, {
              x: imgX,
              y: yPosition - imgHeight, // Draw from top-down
              width: imgWidth,
              height: imgHeight,
            });
            yPosition -= (imgHeight + sectionSpacing);
          }
        }
      } catch (e) {
        console.error('Error processing image for PDF:', e);
      }
    }
    
    // Name
    yPosition = await drawWrappedText(page, name, leftMargin, yPosition, contentWidth, 24, boldFont, rgb(0.1, 0.1, 0.1), 1.2);
    yPosition -= sectionSpacing / 2;

    // Headline
    if (headline) {
      yPosition = await drawWrappedText(page, headline, leftMargin, yPosition, contentWidth, 16, font, rgb(0.3, 0.3, 0.3), 1.2);
      yPosition -= sectionSpacing;
    }
    
    // Horizontal Line
    if (name || headline) { // Only draw line if there was a header
        page.drawLine({
            start: { x: leftMargin, y: yPosition },
            end: { x: rightMargin, y: yPosition },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
        });
        yPosition -= sectionSpacing;
    }


    // Content
    if (content) {
      page.drawText('About Me', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= baseLineHeight * 1.2 * (14/12); // Adjust for font size and add spacing
      yPosition = await drawWrappedText(page, content, leftMargin, yPosition, contentWidth, 11, font, rgb(0.2, 0.2, 0.2));
      yPosition -= sectionSpacing;
    }

    // Interests
    if (interests) {
      page.drawText('Interests', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= baseLineHeight * 1.2 * (14/12);
      yPosition = await drawWrappedText(page, interests.split(',').map(i => `• ${i.trim()}`).join('\n'), leftMargin, yPosition, contentWidth, 11, font, rgb(0.2, 0.2, 0.2));
      yPosition -= sectionSpacing;
    }

    // Skills
    if (skills) {
      page.drawText('Skills', { x: leftMargin, y: yPosition, font: boldFont, size: 14, color: rgb(0.2,0.2,0.2) });
      yPosition -= baseLineHeight * 1.2 * (14/12);
      yPosition = await drawWrappedText(page, skills.split(',').map(s => `• ${s.trim()}`).join('\n'), leftMargin, yPosition, contentWidth, 11, font, rgb(0.2, 0.2, 0.2));
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
