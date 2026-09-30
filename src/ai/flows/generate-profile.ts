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
  prompt: z.string().describe('A prompt describing the desired profile.'),
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
      content: `You are a profile creation expert. Based on the user's prompt, generate a complete profile.
Respond with ONLY a single JSON object, no preamble or commentary, matching exactly this shape:
{
  "name": string,       // a full name for the profile
  "headline": string,   // a short headline or tagline
  "content": string,    // the main "About Me" body, formatted as Markdown (headings, bold, lists, etc. as appropriate)
  "interests": string,  // comma-separated interests
  "skills": string       // comma-separated skills
}
In the "content" field, insert **/n** wherever you want a line break (e.g. between paragraphs) instead of a literal newline character.
You may invent or adjust any of these fields as needed to best match the prompt.`,
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
