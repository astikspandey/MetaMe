'use server';

/**
 * @fileOverview A profile summarization AI agent.
 *
 * - summarizeProfile - A function that handles the profile summarization process.
 * - SummarizeProfileInput - The input type for the summarizeProfile function.
 * - SummarizeProfileOutput - The return type for the summarizeProfile function.
 */

import { z } from 'zod';
import { chatComplete } from '@/ai/client';

const SummarizeProfileInputSchema = z.object({
  profile: z.string().describe('The full profile text to summarize.'),
  length: z
    .enum(['short', 'medium', 'long'])
    .describe('The desired length of the summary.'),
});
export type SummarizeProfileInput = z.infer<typeof SummarizeProfileInputSchema>;

const SummarizeProfileOutputSchema = z.object({
  summary: z.string().describe('The summarized profile text.'),
});
export type SummarizeProfileOutput = z.infer<typeof SummarizeProfileOutputSchema>;

export async function summarizeProfile(input: SummarizeProfileInput): Promise<SummarizeProfileOutput> {
  const { profile, length } = SummarizeProfileInputSchema.parse(input);

  const summary = await chatComplete([
    {
      role: 'system',
      content:
        'You are an expert at summarizing profiles for use on professional networking websites. Respond with only the summary, no preamble or commentary.',
    },
    {
      role: 'user',
      content: `Please provide a summary of the following profile, tailored to be ${length}:\n\nProfile: ${profile}`,
    },
  ]);

  return SummarizeProfileOutputSchema.parse({ summary: summary.trim() });
}
