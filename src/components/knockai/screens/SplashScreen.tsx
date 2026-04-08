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
        <div style={{ width: 120, height: 120, borderRadius: 30, background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, boxShadow: '0 0 40px rgba(26,111,214,0.6)' }}>
          🤜
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>KnockAI</div>
        <div style={{ color: '#6B7280', fontSize: 14, marginTop: -8 }}>AI-Powered Sales Tracker</div>
      </div>
      <div style={{ position: 'absolute', bottom: 48, display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? '#1A6FD6' : '#374151' }} />
        ))}
      </div>
    </div>
  );
}
