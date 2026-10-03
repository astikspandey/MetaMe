import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProfilePageClient } from '@/components/profile-page-client';
import { ProfilePreview } from '@/components/profile-preview';
import { BlockRenderer } from '@/components/builder/block-renderer';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import type { CanvasDoc } from '@/lib/builder-types';
import { CANVAS_ASPECT_RATIO } from '@/lib/builder-types';

interface ProfileDoc {
  name?: string;
  headline?: string;
  content?: string;
  interests?: string;
  skills?: string;
  imageUrl?: string;
}

function decodeDoc(encoded: string): ProfileDoc | CanvasDoc | null {
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

function isCanvasDoc(doc: ProfileDoc | CanvasDoc): doc is CanvasDoc {
  return (doc as CanvasDoc).kind === 'canvas' && Array.isArray((doc as CanvasDoc).blocks);
}

interface HomeProps {
  searchParams: Promise<{ doc?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const doc = params.doc ? decodeDoc(params.doc) : null;

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
          <Button asChild variant="outline" size="lg">
            <Link href="/builder">
              <PlusCircle className="mr-2 h-5 w-5" />
              Build your own MetaMe
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const profileDoc = doc as ProfileDoc | null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {profileDoc ? (
          <div className="space-y-6 max-w-xl mx-auto">
            <ProfilePreview
              name={profileDoc.name || ''}
              headline={profileDoc.headline || ''}
              content={profileDoc.content || ''}
              interests={profileDoc.interests || ''}
              skills={profileDoc.skills || ''}
              imageUrl={profileDoc.imageUrl}
            />
            <div className="flex flex-wrap gap-2 justify-center non-printable-section">
              <Button asChild variant="outline" size="lg">
                <a
                  href={`/profile.pdf?${new URLSearchParams({
                    ...(profileDoc.name ? { name: profileDoc.name } : {}),
                    ...(profileDoc.headline ? { headline: profileDoc.headline } : {}),
                    ...(profileDoc.content ? { content: profileDoc.content } : {}),
                    ...(profileDoc.interests ? { interests: profileDoc.interests } : {}),
                    ...(profileDoc.skills ? { skills: profileDoc.skills } : {}),
                    ...(profileDoc.imageUrl ? { imageUrl: profileDoc.imageUrl } : {}),
                  }).toString()}`}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Download as PDF
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create your own MetaMe
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ProfilePageClient />
        )}
      </main>
      <Footer />
    </div>
  );
}
