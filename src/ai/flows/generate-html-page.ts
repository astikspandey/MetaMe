'use server';

/**
 * @fileOverview Generates a standalone personal profile HTML page from a description,
 * then resolves any {img:"..."} placeholder tokens into real Pixabay/Pexels images.
 * Also returns a lossy Block[] version of the same content, so the result can be
 * handed off to the manual canvas editor for visual tweaking.
 */

import { z } from 'zod';
import { chatComplete } from '@/ai/client';
import { searchTopImage } from '@/lib/image-search';
import { extractImageTokens, buildImgTag, ensureRelativeBody, type ImageToken } from '@/lib/image-tokens';
import type { Block } from '@/lib/builder-types';

const GenerateHtmlPageInputSchema = z.object({
  prompt: z.string().describe('Unstructured text about the person: bio, links, achievements, etc.'),
});
export type GenerateHtmlPageInput = z.infer<typeof GenerateHtmlPageInputSchema>;

export interface GenerateHtmlPageOutput {
  html: string;
  canvas: {
    title: string;
    background: string;
    blocks: Block[];
  };
}

function extractHtmlDoc(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() || 'My MetaMe' : 'My MetaMe';
}

function extractBackground(html: string): string {
  const match = html.match(/body\s*{[^}]*background(?:-color)?\s*:\s*([^;]+);/i);
  return match ? match[1].trim() : '#F0F4F7';
}

function stripHtmlToText(html: string): string {
  let text = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) text = bodyMatch[1];
  text = text.replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr)\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^[ \t]+|[ \t]+$/gm, '').trim();
  return text;
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildImageBlocks(resolved: { token: ImageToken; result: { imageUrl: string; alt: string; credit: string } | null }[]): Block[] {
  const placed = resolved.filter((r) => r.result);
  return placed.map(({ token, result }, i) => {
    const hasLoc = token.x !== undefined && token.y !== undefined;
    return {
      id: newId(),
      type: 'image',
      x: hasLoc ? Math.min(Math.max((token.x as number) - 15, 0), 70) : 55 + (i % 2) * 20,
      y: hasLoc ? Math.min(Math.max((token.y as number) - 15, 0), 70) : 10 + Math.floor(i / 2) * 30,
      width: 30,
      height: 30,
      rotation: token.r ?? 0,
      zIndex: i + 2,
      content: result!.imageUrl,
      alt: result!.alt,
      credit: result!.credit,
      borderRadius: 8,
    };
  });
}

const SYSTEM_PROMPT = `You write a simple, complete, standalone personal profile HTML page.

Output ONLY the HTML: a full document, <!doctype html><html>...<head> with a <title> and inline <style>...</head><body>...</body></html>. No external stylesheets or scripts, except an optional Google Fonts <link> tag for nicer typography. No commentary, no markdown code fences.

Do NOT include any <img> tags yourself — you don't know real image URLs. Instead, wherever a photo or illustration would make the page nicer, insert a plain-text placeholder token right at that spot in the HTML:
- {img:"SEARCH QUERY"} to drop an image inline in the normal flow of the content, or
- {img:"SEARCH QUERY" loc:"X(x)","Y(y)","R(r)"} to pin an image at an exact spot on the page, where X and Y are percentages (0-100) of the page's width/height, and R is a rotation in degrees (try -20 to 20 for a tasteful tilt).
Follow this exact syntax, including the literal "(x)", "(y)", "(r)" suffixes on each number — not "%" or anything else. SEARCH QUERY must be a short, concrete, visual term (e.g. "mountain sunset", "vintage camera", "paintbrush"), never a sentence. Use 1 to 4 tokens total, placed where they'd genuinely improve the page.

General layout guideline, for consistent results — follow this structure unless the user's description clearly calls for something else:
1. A profile picture near the top, roughly centered (use an {img:...} token for it, e.g. a portrait-style query related to the person).
2. Directly below the profile picture: any links the user gave you (website, LinkedIn, Instagram, GitHub, Twitter/X, etc.), as a small row of labeled text links or icons — e.g. "LinkedIn · Website · Instagram". Only include links the user actually provided; never invent a URL. If they gave a bare handle or domain, turn it into a real href (assume https:// and the obvious domain, e.g. a LinkedIn handle becomes https://linkedin.com/in/handle).
3. Name, then a short headline/tagline.
4. A brief bio/about section.
5. Optional: interests, skills, or highlights, if the input supports it.
Keep the overall page short, warm, and curated — this is a personal profile, not a resume or exhaustive history.

Colors: if the user's description mentions a color, color scheme, or palette (by name, hex code, or vibe), you MUST use it as the page's actual background/accent colors — this overrides your own aesthetic judgment. If no colors are specified, pick a tasteful palette yourself.

Base the page's fonts and written content (a name, a short headline, a brief bio) on the user's description below. Make it look like a genuinely nice, modern page.`;

export async function generateHtmlPage(input: GenerateHtmlPageInput): Promise<GenerateHtmlPageOutput> {
  const { prompt } = GenerateHtmlPageInputSchema.parse(input);

  const raw = await chatComplete([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);

  let html = extractHtmlDoc(raw);
  const title = extractTitle(html);
  const background = extractBackground(html);

  const tokens = extractImageTokens(html);
  const resolved = await Promise.all(
    tokens.map(async (token) => ({ token, result: await searchTopImage(token.query) }))
  );

  for (const { token, result } of resolved) {
    const replacement = result ? buildImgTag(token, result.imageUrl, result.alt, result.credit) : '';
    html = html.split(token.raw).join(replacement);
  }

  if (tokens.some((t) => t.x !== undefined)) {
    html = ensureRelativeBody(html);
  }

  // Safety net: strip any leftover/malformed {img:"..."} tokens the regex above didn't catch,
  // so a raw token can never leak onto the rendered page.
  html = html.replace(/\{img:"[^"]*"[^}]*\}/g, '');

  const textContent = stripHtmlToText(html);
  const imageBlocks = buildImageBlocks(resolved);
  const textBlock: Block = {
    id: newId(),
    type: 'text',
    x: 8,
    y: 8,
    width: 84,
    height: 84,
    zIndex: 1,
    content: textContent,
    fontSize: 16,
    textAlign: 'left',
    color: '#222222',
  };

  return {
    html,
    canvas: {
      title,
      background,
      blocks: [textBlock, ...imageBlocks],
    },
  };
}
