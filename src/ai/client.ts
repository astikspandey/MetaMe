const REQUESTY_API_URL = 'https://router.requesty.ai/v1/chat/completions';
const DEFAULT_MODEL = process.env.REQUESTY_MODEL || 'google/gemma-4-31b-it';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.REQUESTY_API_KEY;
  if (!apiKey) {
    throw new Error('REQUESTY_API_KEY is not set. Add it to .env.local.');
  }

  const response = await fetch(REQUESTY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, messages }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Requesty API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Requesty API returned an unexpected response shape.');
  }
  return content;
}
