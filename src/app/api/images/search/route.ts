import { NextRequest, NextResponse } from 'next/server';
import { searchPixabay, searchPexels } from '@/lib/image-search';

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
