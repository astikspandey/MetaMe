export interface ImageSearchResult {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  alt: string;
  credit: string;
}

export async function searchPixabay(query: string): Promise<ImageSearchResult[]> {
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

export async function searchPexels(query: string): Promise<ImageSearchResult[]> {
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

/** Searches both Pixabay and Pexels, coin-flips between their top results. */
export async function searchTopImage(query: string): Promise<ImageSearchResult | null> {
  const [pixabay, pexels] = await Promise.allSettled([searchPixabay(query), searchPexels(query)]);
  const pixabayTop = pixabay.status === 'fulfilled' ? pixabay.value[0] : undefined;
  const pexelsTop = pexels.status === 'fulfilled' ? pexels.value[0] : undefined;

  if (pixabay.status === 'rejected') console.warn('Pixabay search failed:', pixabay.reason);
  if (pexels.status === 'rejected') console.warn('Pexels search failed:', pexels.reason);

  if (pixabayTop && pexelsTop) {
    return Math.random() < 0.5 ? pixabayTop : pexelsTop;
  }
  return pixabayTop || pexelsTop || null;
}
