import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ProfilePageClient } from '@/components/profile-page-client';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <ProfilePageClient />
      </main>
      <Footer />
    </div>
  );
}
