'use server';

/**
 * @fileOverview Generates a profile based on a user-provided prompt.
 *
 * - generateProfile - A function that generates a profile based on a prompt.
 * - GenerateProfileInput - The input type for the generateProfile function.
 * - GenerateProfileOutput - The return type for the generateProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProfileInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired profile.'),
});
export type GenerateProfileInput = z.infer<typeof GenerateProfileInputSchema>;

const GenerateProfileOutputSchema = z.object({
  profile: z.string().describe('The generated profile content.'),
});
export type GenerateProfileOutput = z.infer<typeof GenerateProfileOutputSchema>;

export async function generateProfile(input: GenerateProfileInput): Promise<GenerateProfileOutput> {
  return generateProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProfilePrompt',
  input: {schema: GenerateProfileInputSchema},
  output: {schema: GenerateProfileOutputSchema},
  prompt: `You are a profile creation expert.  Create a profile based on the following prompt:\n\n{{prompt}}`,
});

const generateProfileFlow = ai.defineFlow(
  {
    name: 'generateProfileFlow',
    inputSchema: GenerateProfileInputSchema,
    outputSchema: GenerateProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
