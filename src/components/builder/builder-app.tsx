"use client";

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CanvasBlock } from '@/components/builder/canvas-block';
import { ImageSearchDialog } from '@/components/builder/image-search-dialog';
import type { ImageSearchResult } from '@/lib/image-search';
import { generatePageHtml } from '@/ai/flows/generate-page-html';
import { generateHtmlPage } from '@/ai/flows/generate-html-page';
import type { Block, CanvasDoc } from '@/lib/builder-types';
import { CANVAS_ASPECT_RATIO } from '@/lib/builder-types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Type, ImagePlus, Download, LinkIcon, Loader2, Sparkles } from 'lucide-react';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = CANVAS_WIDTH / CANVAS_ASPECT_RATIO;

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function encodeDoc(doc: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function BuilderApp() {
  const { toast } = useToast();

  // --- AI generate mode ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharingAi, setIsSharingAi] = useState(false);

  const handleGenerateHtml = async () => {
    if (!aiPrompt.trim()) {
      toast({ variant: 'destructive', title: 'Tell us about yourself first.' });
      return;
    }
    setIsGenerating(true);
    try {
      const { html } = await generateHtmlPage({ prompt: aiPrompt });
      setGeneratedHtml(html);
      logger.info('AI page generated', { promptLength: aiPrompt.length, htmlLength: html.length });
      toast({ title: 'Page generated!', description: 'Download it or copy a free share link below.' });
    } catch (error) {
      logger.error('AI page generation failed', error, { promptLength: aiPrompt.length });
      toast({ variant: 'destructive', title: 'Generation failed', description: 'Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metame-profile.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareHtml = async () => {
    if (!generatedHtml) return;
    setIsSharingAi(true);
    try {
      const encoded = encodeDoc({ kind: 'html', html: generatedHtml });
      const shareUrl = `${window.location.origin}/?doc=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Share link copied!', description: 'Anyone with this free link can view your profile.' });
    } catch (error) {
      logger.error('Failed to copy AI page share link', error);
      toast({ variant: 'destructive', title: 'Failed to copy link' });
    } finally {
      setIsSharingAi(false);
    }
  };

  // --- Manual canvas mode ---
  const [title, setTitle] = useState('My MetaMe');
  const [background, setBackground] = useState('#F0F4F7');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

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
      const encoded = encodeDoc(buildDoc());
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
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="ai">
          <Sparkles className="mr-2 h-4 w-4" /> AI Generate
        </TabsTrigger>
        <TabsTrigger value="manual">Manual Canvas</TabsTrigger>
      </TabsList>

      <TabsContent value="ai" className="space-y-6">
        <div className="space-y-2 max-w-2xl mx-auto">
          <Label htmlFor="ai-page-prompt" className="text-lg font-medium">About You</Label>
          <Textarea
            id="ai-page-prompt"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Paste your bio, LinkedIn, website, whatever — the AI will write a simple page and drop in photos from Pixabay/Pexels wherever it sees fit."
            className="min-h-[150px] text-base"
            rows={6}
          />
          <Button type="button" onClick={handleGenerateHtml} disabled={isGenerating} size="lg">
            {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            Generate Page
          </Button>
        </div>

        {generatedHtml && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <iframe
              srcDoc={generatedHtml}
              sandbox=""
              className="w-full border rounded shadow-lg bg-white"
              style={{ height: '80vh' }}
              title="Generated profile preview"
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <Button type="button" variant="outline" onClick={handleDownloadHtml}>
                <Download className="mr-2 h-4 w-4" /> Download HTML
              </Button>
              <Button type="button" variant="secondary" onClick={handleShareHtml} disabled={isSharingAi}>
                {isSharingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                Copy Free Share Link
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="manual">
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
                <div>
                  <Label className="text-xs">Rotation °</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedBlock.rotation ?? 0)}
                    onChange={(e) => updateBlock(selectedBlock.id, { rotation: Number(e.target.value) })}
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
      </TabsContent>

      <ImageSearchDialog open={imageDialogOpen} onOpenChange={setImageDialogOpen} onSelect={handleImageSelected} />
    </Tabs>
  );
}
