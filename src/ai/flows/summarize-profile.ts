'use server';

/**
 * @fileOverview A profile summarization AI agent.
 *
 * - summarizeProfile - A function that handles the profile summarization process.
 * - SummarizeProfileInput - The input type for the summarizeProfile function.
 * - SummarizeProfileOutput - The return type for the summarizeProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return summarizeProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProfilePrompt',
  input: {schema: SummarizeProfileInputSchema},
  output: {schema: SummarizeProfileOutputSchema},
  prompt: `You are an expert at summarizing profiles for use on professional networking websites.

  Please provide a summary of the following profile, tailored to be {{length}}:

  Profile: {{{profile}}} `,
});

const summarizeProfileFlow = ai.defineFlow(
  {
    name: 'summarizeProfileFlow',
    inputSchema: SummarizeProfileInputSchema,
    outputSchema: SummarizeProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
