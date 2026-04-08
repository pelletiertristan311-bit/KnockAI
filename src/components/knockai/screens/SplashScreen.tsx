'use client';
import { useEffect } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

export default function SplashScreen() {
  const setAuthScreen = useKnockAIStore((s) => s.setAuthScreen);

  useEffect(() => {
    const t = setTimeout(() => setAuthScreen('onboarding'), 2000);
    return () => clearTimeout(t);
  }, [setAuthScreen]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #0D2B55 0%, #1E1E2E 100%)', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 140, height: 140, borderRadius: 32, overflow: 'hidden', boxShadow: '0 0 50px rgba(26,111,214,0.5)' }}>
          <img src="/knockai-icon.png" alt="KnockAI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>AI-Powered Sales Tracker</div>
      </div>
      <div style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#1A6FD6' : '#374151' }} />
        ))}
      </div>
    </div>
  );
}
