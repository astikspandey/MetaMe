
"use client";

import { useState, useEffect } from 'react';

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-secondary text-secondary-foreground py-6 text-center mt-auto">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {currentYear !== null ? currentYear : ''} MetaMe Profile Forge. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          Craft your unique digital identity.
        </p>
      </div>
    </footer>
  );
}
