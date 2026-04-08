'use client';
import { useKnockAIStore } from '@/lib/knockai/store';

const NAV_LABELS: Record<string, { home: string; team: string; map: string; settings: string }> = {
  en: { home: 'Home', team: 'Team', map: 'Map', settings: 'Settings' },
  fr: { home: 'Accueil', team: 'Équipe', map: 'Carte', settings: 'Réglages' },
  es: { home: 'Inicio', team: 'Equipo', map: 'Mapa', settings: 'Ajustes' },
};

export default function BottomNav({ isDesktop = false }: { isDesktop?: boolean }) {
  const { activeTab, setActiveTab, user } = useKnockAIStore();
  const t = NAV_LABELS[user?.language || 'fr'] || NAV_LABELS.fr;
  const tabs = [
    { id: 'home' as const, label: t.home, icon: HomeIcon },
    { id: 'team' as const, label: t.team, icon: TeamIcon },
    { id: 'map' as const, label: t.map, icon: MapIcon },
    { id: 'settings' as const, label: t.settings, icon: SettingsIcon },
  ];

  if (isDesktop) {
    return (
      <div style={{ width: 220, flexShrink: 0, background: '#0D2B55', borderRight: '1px solid rgba(26,111,214,0.2)', display: 'flex', flexDirection: 'column', padding: '32px 0 24px' }}>
        <div style={{ paddingLeft: 20, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <img src="/knockai-logo.jpeg" alt="KnockAI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>Knock<span style={{ color: '#1A6FD6' }}>AI</span></div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Door-to-door platform</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: active ? 'rgba(26,111,214,0.15)' : 'none', border: active ? '1px solid rgba(26,111,214,0.3)' : '1px solid transparent', cursor: 'pointer', color: active ? '#1A6FD6' : '#9CA3AF', transition: 'all 0.2s', textAlign: 'left', width: '100%' }}>
                <Icon size={20} />
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 80, background: '#0D2B55', borderTop: '1px solid rgba(26,111,214,0.2)', display: 'flex', alignItems: 'stretch', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: active ? '#1A6FD6' : '#6B7280', transition: 'all 0.2s', position: 'relative' }}>
            <div style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>
              <Icon size={22} />
            </div>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{label}</span>
            {active && <div style={{ position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: '50%', background: '#1A6FD6' }} />}
          </button>
        );
      })}
    </div>
  );
}

function HomeIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function TeamIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}
function MapIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>;
}
function SettingsIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
