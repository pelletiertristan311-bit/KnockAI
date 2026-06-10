'use client';
import { useEffect } from 'react';

export default function KnockAILayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/location-worker.js').catch(() => {});
    }
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {children}
    </div>
  );
}
