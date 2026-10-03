'use server';

/**
 * @fileOverview Generates a standalone personal profile HTML page from a description,
 * then resolves any {img:"..."} placeholder tokens into real Pixabay/Pexels images.
 */

import { z } from 'zod';
import { chatComplete } from '@/ai/client';
import { searchTopImage } from '@/lib/image-search';
import { extractImageTokens, buildImgTag, ensureRelativeBody } from '@/lib/image-tokens';

const GenerateHtmlPageInputSchema = z.object({
  prompt: z.string().describe('Unstructured text about the person: bio, links, achievements, etc.'),
});
export type GenerateHtmlPageInput = z.infer<typeof GenerateHtmlPageInputSchema>;

const GenerateHtmlPageOutputSchema = z.object({
  html: z.string(),
});
export type GenerateHtmlPageOutput = z.infer<typeof GenerateHtmlPageOutputSchema>;

function extractHtmlDoc(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
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

  return GenerateHtmlPageOutputSchema.parse({ html });
}
