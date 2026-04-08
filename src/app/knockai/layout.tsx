'use client';
export default function KnockAILayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {children}
    </div>
  );
}
