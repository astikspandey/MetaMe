'use server';

/**
 * @fileOverview Turns a canvas layout of blocks into a standalone, polished HTML file.
 */

import { z } from 'zod';
import { chatComplete } from '@/ai/client';
import type { Block } from '@/lib/builder-types';

const BlockSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number(),
  content: z.string(),
  fontSize: z.number().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  color: z.string().optional(),
  alt: z.string().optional(),
  credit: z.string().optional(),
  borderRadius: z.number().optional(),
});

const GeneratePageHtmlInputSchema = z.object({
  title: z.string(),
  background: z.string(),
  blocks: z.array(BlockSchema),
});
export type GeneratePageHtmlInput = z.infer<typeof GeneratePageHtmlInputSchema>;

const GeneratePageHtmlOutputSchema = z.object({
  html: z.string(),
});
export type GeneratePageHtmlOutput = z.infer<typeof GeneratePageHtmlOutputSchema>;

function extractHtml(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

export async function generatePageHtml(input: {
  title: string;
  background: string;
  blocks: Block[];
}): Promise<GeneratePageHtmlOutput> {
  const parsedInput = GeneratePageHtmlInputSchema.parse(input);

  const layoutDescription = parsedInput.blocks
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((block, i) => {
      const base = `Block ${i + 1} [${block.type}]: position left=${block.x.toFixed(1)}%, top=${block.y.toFixed(1)}%, width=${block.width.toFixed(1)}%, height=${block.height.toFixed(1)}%, z-index=${block.zIndex}`;
      if (block.type === 'text') {
        return `${base}, fontSize=${block.fontSize ?? 16}px, align=${block.textAlign ?? 'left'}, color=${block.color ?? '#222222'}\nText content: "${block.content}"`;
      }
      return `${base}, borderRadius=${block.borderRadius ?? 0}px\nImage URL: ${block.content}${block.alt ? `\nAlt text: ${block.alt}` : ''}${block.credit ? `\nCredit (must be shown, small, unobtrusive): ${block.credit}` : ''}`;
    })
    .join('\n\n');

  const raw = await chatComplete([
    {
      role: 'system',
      content: `You are a front-end developer turning a user's freeform profile-page layout into a single, polished, standalone HTML file.

Rules:
- Output ONLY the HTML, no markdown fences, no commentary.
- It must be a complete document: <!doctype html><html>...<head> with a <title> and inline <style>...</head><body>...</body></html>. No external stylesheets, fonts, or scripts except Google Fonts via a <link> tag if you want nicer typography.
- Reproduce the given layout faithfully: each block's position/size (given as percentages of the page) must be honored using CSS (e.g. a relatively-positioned container with absolutely-positioned children, or an equivalent responsive approach). Preserve reading order and z-index.
- For image blocks, use the exact image URL given in an <img> tag (do not invent a different image), with the given border radius, and show any credit line unobtrusively (small, low-contrast, near the image).
- For text blocks, use the exact text content given, styled with the given font size/alignment/color, but you may pick complementary fonts, spacing, and subtle polish (shadows, section backgrounds) as long as you do not change the wording or move blocks from their given position.
- The page background should use this color/value: ${parsedInput.background}
- Make it look like a genuinely nice, modern personal profile page, mobile-responsive if reasonably possible without breaking the given layout on desktop.
- Page title: ${parsedInput.title}`,
    },
    {
      role: 'user',
      content: `Layout (percentages are relative to the page):\n\n${layoutDescription}`,
    },
  ]);

  const html = extractHtml(raw);
  return GeneratePageHtmlOutputSchema.parse({ html });
}
