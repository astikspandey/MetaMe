import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BuilderApp } from '@/components/builder/builder-app';
import { BlockRenderer } from '@/components/builder/block-renderer';
import type { CanvasDoc } from '@/lib/builder-types';
import { CANVAS_ASPECT_RATIO } from '@/lib/builder-types';

interface HtmlDoc {
  kind: 'html';
  html: string;
}

function decodeDoc(encoded: string): CanvasDoc | HtmlDoc | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function isCanvasDoc(doc: CanvasDoc | HtmlDoc): doc is CanvasDoc {
  return doc.kind === 'canvas' && Array.isArray((doc as CanvasDoc).blocks);
}

function isHtmlDoc(doc: CanvasDoc | HtmlDoc): doc is HtmlDoc {
  return doc.kind === 'html' && typeof (doc as HtmlDoc).html === 'string';
}

interface HomeProps {
  searchParams: Promise<{ doc?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const doc = params.doc ? decodeDoc(params.doc) : null;

  if (doc && isHtmlDoc(doc)) {
    return (
      <iframe
        srcDoc={doc.html}
        sandbox=""
        title="Shared profile"
        style={{ border: 0, width: '100vw', height: '100vh', display: 'block' }}
      />
    );
  }

  if (doc && isCanvasDoc(doc)) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl flex flex-col items-center gap-6">
          <div
            className="relative w-full max-w-3xl border shadow-lg"
            style={{ aspectRatio: CANVAS_ASPECT_RATIO, background: doc.background }}
          >
            {doc.blocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <BuilderApp />
      </main>
      <Footer />
    </div>
  );
}
