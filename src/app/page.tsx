import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProfilePageClient } from '@/components/profile-page-client';
import { ProfilePreview } from '@/components/profile-preview';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';

interface ProfileDoc {
  name?: string;
  headline?: string;
  content?: string;
  interests?: string;
  skills?: string;
  imageUrl?: string;
}

function decodeProfileDoc(encoded: string): ProfileDoc | null {
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

interface HomeProps {
  searchParams: Promise<{ doc?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const doc = params.doc ? decodeProfileDoc(params.doc) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {doc ? (
          <div className="space-y-6 max-w-xl mx-auto">
            <ProfilePreview
              name={doc.name || ''}
              headline={doc.headline || ''}
              content={doc.content || ''}
              interests={doc.interests || ''}
              skills={doc.skills || ''}
              imageUrl={doc.imageUrl}
            />
            <div className="flex flex-wrap gap-2 justify-center non-printable-section">
              <Button asChild variant="outline" size="lg">
                <a
                  href={`/profile.pdf?${new URLSearchParams({
                    ...(doc.name ? { name: doc.name } : {}),
                    ...(doc.headline ? { headline: doc.headline } : {}),
                    ...(doc.content ? { content: doc.content } : {}),
                    ...(doc.interests ? { interests: doc.interests } : {}),
                    ...(doc.skills ? { skills: doc.skills } : {}),
                    ...(doc.imageUrl ? { imageUrl: doc.imageUrl } : {}),
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
