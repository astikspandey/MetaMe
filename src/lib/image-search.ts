export interface ImageSearchResult {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  alt: string;
  credit: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs queued tasks one at a time per provider, with a minimum gap between
 *  requests, so a page with several image tokens doesn't fire a burst of
 *  concurrent calls at the same API and trip its rate limit. */
class RequestQueue {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly minGapMs: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const started = this.tail.then(task, task);
    this.tail = started.then(
      () => sleep(this.minGapMs),
      () => sleep(this.minGapMs)
    );
    return started;
  }
}

const pixabayQueue = new RequestQueue(300);
const pexelsQueue = new RequestQueue(300);

async function fetchWithRetry(url: string, init: RequestInit | undefined, label: string, maxAttempts = 4): Promise<Response> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, init);
    if (response.status !== 429) return response;
    if (attempt === maxAttempts) return response;
    const retryAfter = Number(response.headers.get('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    console.warn(`${label} rate-limited (429), retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
    await sleep(delayMs);
  }
  // unreachable, satisfies TS
  return fetch(url, init);
}

export async function searchPixabay(query: string): Promise<ImageSearchResult[]> {
  return pixabayQueue.run(async () => {
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
      throw new Error('PIXABAY_API_KEY is not set. Add it to .env.local.');
    }
    const url = `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=all&safesearch=true&per_page=24`;
    const response = await fetchWithRetry(url, undefined, 'Pixabay');
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
  });
}

export async function searchPexels(query: string): Promise<ImageSearchResult[]> {
  return pexelsQueue.run(async () => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      throw new Error('PEXELS_API_KEY is not set. Add it to .env.local.');
    }
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=24`;
    const response = await fetchWithRetry(url, { headers: { Authorization: apiKey } }, 'Pexels');
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
  });
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
