import { NextRequest, NextResponse } from 'next/server';

export interface ImageSearchResult {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  alt: string;
  credit: string;
}

async function searchPixabay(query: string): Promise<ImageSearchResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    throw new Error('PIXABAY_API_KEY is not set. Add it to .env.local.');
  }
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=all&safesearch=true&per_page=24`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pixabay API error (${response.status})`);
  }
  const data = await response.json();
  return (data.hits || []).map((hit: any) => ({
    id: `pixabay-${hit.id}`,
    thumbnailUrl: hit.webformatURL,
    imageUrl: hit.largeImageURL || hit.webformatURL,
    alt: hit.tags || query,
    credit: `${hit.user} on Pixabay`,
  }));
}

async function searchPexels(query: string): Promise<ImageSearchResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY is not set. Add it to .env.local.');
  }
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=24`;
  const response = await fetch(url, { headers: { Authorization: apiKey } });
  if (!response.ok) {
    throw new Error(`Pexels API error (${response.status})`);
  }
  const data = await response.json();
  return (data.photos || []).map((photo: any) => ({
    id: `pexels-${photo.id}`,
    thumbnailUrl: photo.src.medium,
    imageUrl: photo.src.large2x || photo.src.original,
    alt: photo.alt || query,
    credit: `${photo.photographer} on Pexels`,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
  }

  try {
    const results = source === 'pexels' ? await searchPexels(query) : await searchPixabay(query);
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Image search failed:', error);
    return NextResponse.json({ error: error.message || 'Image search failed.' }, { status: 500 });
  }
}
