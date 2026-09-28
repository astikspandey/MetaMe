'use server';

/**
 * @fileOverview Generates a profile based on a user-provided prompt.
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
  profile: z.string().describe('The generated profile content.'),
});
export type GenerateProfileOutput = z.infer<typeof GenerateProfileOutputSchema>;

export async function generateProfile(input: GenerateProfileInput): Promise<GenerateProfileOutput> {
  const { prompt } = GenerateProfileInputSchema.parse(input);

  const profile = await chatComplete([
    {
      role: 'system',
      content:
        'You are a profile creation expert. Create a profile based on the user prompt. Respond with only the profile content, no preamble or commentary.',
    },
    { role: 'user', content: prompt },
  ]);

  return GenerateProfileOutputSchema.parse({ profile: profile.trim() });
}
