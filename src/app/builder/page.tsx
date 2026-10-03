"use client";

import { useRef, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CanvasBlock } from '@/components/builder/canvas-block';
import { ImageSearchDialog } from '@/components/builder/image-search-dialog';
import type { ImageSearchResult } from '@/app/api/images/search/route';
import { generatePageHtml } from '@/ai/flows/generate-page-html';
import type { Block, CanvasDoc } from '@/lib/builder-types';
import { CANVAS_ASPECT_RATIO } from '@/lib/builder-types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Type, ImagePlus, Download, LinkIcon, Loader2 } from 'lucide-react';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = CANVAS_WIDTH / CANVAS_ASPECT_RATIO;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function encodeCanvasDoc(doc: CanvasDoc): string {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function BuilderPage() {
  const [title, setTitle] = useState('My MetaMe');
  const [background, setBackground] = useState('#F0F4F7');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  const addTextBlock = () => {
    const block: Block = {
      id: newId(),
      type: 'text',
      x: 10,
      y: 10,
      width: 40,
      height: 15,
      zIndex: blocks.length + 1,
      content: 'About goes here...',
      fontSize: 16,
      textAlign: 'left',
      color: '#222222',
    };
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  };

  const addImageBlock = () => {
    const block: Block = {
      id: newId(),
      type: 'image',
      x: 55,
      y: 10,
      width: 30,
      height: 30,
      zIndex: blocks.length + 1,
      content: '',
      borderRadius: 8,
    };
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
    setImageTargetId(block.id);
    setImageDialogOpen(true);
  };

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleImageSelected = (result: ImageSearchResult) => {
    if (!imageTargetId) return;
    updateBlock(imageTargetId, { content: result.imageUrl, alt: result.alt, credit: result.credit });
  };

  const buildDoc = (): CanvasDoc => ({ kind: 'canvas', title, background, blocks });

  const handleExportHtml = async () => {
    if (blocks.length === 0) {
      toast({ variant: 'destructive', title: 'Add some blocks first', description: 'Your canvas is empty.' });
      return;
    }
    setIsExporting(true);
    try {
      const { html } = await generatePageHtml(buildDoc());
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'metame-profile'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      logger.info('Exported builder page HTML', { blockCount: blocks.length });
      toast({ title: 'HTML exported!', description: 'Host this file anywhere, or use the share link below.' });
    } catch (error) {
      logger.error('Failed to export page HTML', error, { blockCount: blocks.length });
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not generate the HTML file.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (blocks.length === 0) {
      toast({ variant: 'destructive', title: 'Add some blocks first', description: 'Your canvas is empty.' });
      return;
    }
    setIsSharing(true);
    try {
      const encoded = encodeCanvasDoc(buildDoc());
      const shareUrl = `${window.location.origin}/?doc=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Share link copied!', description: 'Anyone with this free link can view your profile.' });
    } catch (error) {
      logger.error('Failed to copy builder share link', error, { blockCount: blocks.length });
      toast({ variant: 'destructive', title: 'Failed to copy link', description: 'Could not copy the link to your clipboard.' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Label htmlFor="page-title" className="text-sm">Page Title</Label>
            <Input id="page-title" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="bg-color" className="text-sm">Background</Label>
            <input
              id="bg-color"
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-9 w-12 rounded border"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addTextBlock}>
              <Type className="mr-2 h-4 w-4" /> Add Text
            </Button>
            <Button type="button" variant="outline" onClick={addImageBlock}>
              <ImagePlus className="mr-2 h-4 w-4" /> Add Image
            </Button>
            <Button type="button" onClick={handleExportHtml} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export HTML
            </Button>
            <Button type="button" variant="secondary" onClick={handleCopyShareLink} disabled={isSharing}>
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Copy Free Share Link
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          <div
            ref={canvasRef}
            className="relative border shadow-lg mx-auto"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background, flexShrink: 0 }}
            onMouseDown={(e) => {
              if (e.target === canvasRef.current) setSelectedId(null);
            }}
          >
            {blocks.map((block) => (
              <CanvasBlock
                key={block.id}
                block={block}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                selected={selectedId === block.id}
                onSelect={() => setSelectedId(block.id)}
                onChange={(patch) => updateBlock(block.id, patch)}
                onDelete={() => deleteBlock(block.id)}
                onPickImage={() => {
                  setImageTargetId(block.id);
                  setImageDialogOpen(true);
                }}
              />
            ))}
            {blocks.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground text-center px-8">
                Add a text or image block, then drag/resize it anywhere on this canvas.
              </p>
            )}
          </div>

          {selectedBlock && (
            <div className="w-64 flex-shrink-0 space-y-4 border rounded p-4 h-fit">
              <h3 className="font-medium text-sm">Block Settings</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X %</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.x)}
                    onChange={(e) => updateBlock(selectedBlock.id, { x: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Y %</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.y)}
                    onChange={(e) => updateBlock(selectedBlock.id, { y: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Width %</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.width)}
                    onChange={(e) => updateBlock(selectedBlock.id, { width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Height %</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.height)}
                    onChange={(e) => updateBlock(selectedBlock.id, { height: Number(e.target.value) })}
                  />
                </div>
              </div>

              {selectedBlock.type === 'text' && (
                <>
                  <div>
                    <Label className="text-xs">Font size</Label>
                    <Input
                      type="number"
                      value={selectedBlock.fontSize ?? 16}
                      onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <input
                      type="color"
                      value={selectedBlock.color ?? '#222222'}
                      onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                      className="h-9 w-full rounded border"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <Button
                        key={align}
                        type="button"
                        size="sm"
                        variant={selectedBlock.textAlign === align ? 'default' : 'outline'}
                        onClick={() => updateBlock(selectedBlock.id, { textAlign: align })}
                      >
                        {align}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {selectedBlock.type === 'image' && (
                <div>
                  <Label className="text-xs">Corner radius</Label>
                  <Input
                    type="number"
                    value={selectedBlock.borderRadius ?? 0}
                    onChange={(e) => updateBlock(selectedBlock.id, { borderRadius: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Drag blocks to move them, drag a corner to resize. Double-click an image block to change its picture.
        </p>
      </main>
      <Footer />

      <ImageSearchDialog open={imageDialogOpen} onOpenChange={setImageDialogOpen} onSelect={handleImageSelected} />
    </div>
  );
}
