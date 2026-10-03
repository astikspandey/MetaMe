"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import type { ImageSearchResult } from '@/app/api/images/search/route';
import { logger } from '@/lib/logger';

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ImageSearchResult) => void;
}

export function ImageSearchDialog({ open, onOpenChange, onSelect }: ImageSearchDialogProps) {
  const [source, setSource] = useState<'pixabay' | 'pexels'>('pixabay');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (nextSource: 'pixabay' | 'pexels' = source) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/images/search?source=${nextSource}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Search failed (${response.status})`);
      }
      setResults(data.results || []);
      logger.info('Image search succeeded', { source: nextSource, query, count: data.results?.length ?? 0 });
    } catch (err: any) {
      logger.error('Image search failed', err, { source: nextSource, query });
      setError(err.message || 'Search failed.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find an image</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button
            type="button"
            variant={source === 'pixabay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSource('pixabay')}
          >
            Pixabay
          </Button>
          <Button
            type="button"
            variant={source === 'pexels' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSource('pexels')}
          >
            Pexels
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          className="flex gap-2 mb-4"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. mountains, laptop, abstract art..."
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => {
                onSelect(result);
                onOpenChange(false);
              }}
              className="group relative aspect-square overflow-hidden rounded border hover:ring-2 hover:ring-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.thumbnailUrl} alt={result.alt} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {!isSearching && results.length === 0 && !error && (
          <p className="text-sm text-muted-foreground text-center py-8">Search to see results.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
