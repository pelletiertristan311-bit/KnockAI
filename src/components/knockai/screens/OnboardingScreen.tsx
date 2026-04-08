'use client';
import { useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

const slides = [
  {
    icon: '🤖',
    title: 'Assistant IA invisible',
    desc: "KnockAI détecte automatiquement quand tu passes devant une maison et place un lead pour toi — même si tu es en pleine conversation.",
    bullets: ['Détecte ta position en temps réel', 'Crée les leads automatiquement', 'Tu gardes le contrôle final'],
    color: '#0066CC',
  },
  {
    icon: '🗺️',
    title: 'Carte intelligente en temps réel',
    desc: "La carte devient un outil vivant. Elle montre exactement quelles maisons ont été approchées.",
    bullets: ['Tes coéquipiers visibles en direct', 'Zéro double-knock', "Zones couvertes d'un coup d'œil"],
    color: '#8B5CF6',
  },
  {
    icon: '📊',
    title: 'Données précises = plus de ventes',
    desc: "Doors knocked, ventes, temps travaillé, sales/heure — tout est mesuré pour améliorer ta performance.",
    bullets: ['Suivi automatique de chaque shift', 'Historique par date', "Stats d'équipe en temps réel"],
    color: '#10B981',
  },
];

export default function OnboardingScreen() {
  const [idx, setIdx] = useState(0);
  const setAuthScreen = useKnockAIStore((s) => s.setAuthScreen);

  const next = () => {
    if (idx < slides.length - 1) setIdx(idx + 1);
    else setAuthScreen('login');
  };

  const slide = slides[idx];

  return (
    <div style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0D2B55 0%, #1E1E2E 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px' }}>
        <button onClick={() => setAuthScreen('login')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 14, cursor: 'pointer' }}>Skip</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{slide.icon}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: '#fff' }}>{slide.title}</h2>
        <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, maxWidth: 300, marginBottom: 16 }}>{slide.desc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 280 }}>
          {slide.bullets.map((b) => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 10, background: `${slide.color}18`, border: `1px solid ${slide.color}33` }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: slide.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>✓</div>
              <span style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 500 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {slides.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? '#1A6FD6' : '#374151', cursor: 'pointer', transition: 'all 0.3s' }} />
        ))}
      </div>

      <div style={{ padding: '0 24px 40px' }}>
        <button onClick={next} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #1A6FD6, #00B4D8)', color: '#fff', fontSize: 17, fontWeight: 700, boxShadow: '0 4px 20px rgba(26,111,214,0.4)' }}>
          {idx === slides.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
