'use server';

/**
 * @fileOverview Generates a full profile based on a user-provided prompt.
 *
 * - generateProfile - A function that generates a profile based on a prompt.
 * - GenerateProfileInput - The input type for the generateProfile function.
 * - GenerateProfileOutput - The return type for the generateProfile function.
 */

import { z } from 'zod';
import { chatComplete } from '@/ai/client';

const GenerateProfileInputSchema = z.object({
  prompt: z.string().describe('Unstructured text about the person: bio, links, achievements, etc.'),
});
export type GenerateProfileInput = z.infer<typeof GenerateProfileInputSchema>;

const GenerateProfileOutputSchema = z.object({
  name: z.string().describe('A full name for the profile.'),
  headline: z.string().describe('A short headline or tagline.'),
  content: z.string().describe('The main "About Me" body, formatted as Markdown.'),
  interests: z.string().describe('Comma-separated list of interests.'),
  skills: z.string().describe('Comma-separated list of skills.'),
});
export type GenerateProfileOutput = z.infer<typeof GenerateProfileOutputSchema>;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

export async function generateProfile(input: GenerateProfileInput): Promise<GenerateProfileOutput> {
  const { prompt } = GenerateProfileInputSchema.parse(input);

  const raw = await chatComplete([
    {
      role: 'system',
      content: `You turn a messy wall of text about a person — a bio, a LinkedIn/website link, career notes, interests, achievements, anything — into a short, curated personal profile. This is NOT a resume: don't produce exhaustive job-history bullet points or formal CV structure. Write it like a polished "about me" a person would proudly share, in their voice where possible.

The input will rarely spell out a name or a title directly — infer them:
- "name": pull the person's actual name from the text if present; otherwise infer a reasonable one from context (e.g. from a link/handle), never leave it generic like "N/A" or "User".
- "headline": a short, punchy title/tagline that captures who they are (e.g. "Sustainability-focused Software Engineer"), derived from the substance of the text, not copied verbatim from it.

Respond with ONLY a single JSON object, no preamble or commentary, matching exactly this shape:
{
  "name": string,       // the person's name, inferred from the text
  "headline": string,   // a short, derived headline/tagline
  "content": string,    // a curated "About Me" narrative, formatted as Markdown (headings, bold, lists, etc. as appropriate) — concise and editorial, not a full resume dump
  "interests": string,  // comma-separated interests
  "skills": string       // comma-separated skills
}
In the "content" field, insert **/n** wherever you want a line break (e.g. between paragraphs) instead of a literal newline character.`,
    },
    { role: 'user', content: prompt },
  ]);

  const parsed = JSON.parse(extractJson(raw));
  const output = GenerateProfileOutputSchema.parse(parsed);
  return {
    ...output,
    content: output.content.replace(/\*\*\/n\*\*/gi, '\n'),
  };
}
