'use client';
import { useEffect, useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';
import { useTeamPins } from '@/hooks/knockai/useTeamPins';
import { useTeamDrawings } from '@/hooks/knockai/useTeamDrawings';
import { useTeamSigns } from '@/hooks/knockai/useTeamSigns';
import { useLiveLocation } from '@/hooks/knockai/useLiveLocation';
import { useTeamLocations } from '@/hooks/knockai/useTeamLocations';
import { useTeamBroadcasts, type TeamToast } from '@/hooks/knockai/useTeamBroadcasts';
import { WifiOff } from 'lucide-react';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import TeamScreen from './screens/TeamScreen';
import MapScreen from './screens/MapScreen';
import SettingsScreen from './screens/SettingsScreen';
import BottomNav from './BottomNav';
import AddPinModal from './modals/AddPinModal';
import EditPinModal from './modals/EditPinModal';
import StatsModal from './modals/StatsModal';
import DemoTutorialOverlay from './DemoTutorialOverlay';

export default function KnockAIApp() {
  const { isAuthenticated, authScreen, activeTab, addPinModal, editPinModal, statsModal, isOnline, setOnline, user, team } = useKnockAIStore();
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [teamToasts, setTeamToasts] = useState<TeamToast[]>([]);

  // Supabase Realtime — instant pin and drawing sync across team members
  const realtimeStatus = useTeamPins(team?.id, user?.id);
  useTeamDrawings(team?.id, user?.id);
  useTeamSigns(team?.id, user?.id);
  // Live location tracking — sends own GPS while clocked in, shows teammates on map
  useLiveLocation();
  useTeamLocations(team?.id, user?.id);
  // Centralized team broadcast notifications (clock in/out + sales)
  useTeamBroadcasts(team?.id, user?.id, setTeamToasts);

  useEffect(() => {
    setMounted(true);
    document.title = 'KnockAI';
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);

    const handleOnline = () => {
      setOnline(true);
      const s = useKnockAIStore.getState();
      if (s.user?.email) {
        fetch('/api/knockai/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: s.user.email, userData: { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user } }) }).catch(() => {});
      }
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Accounts that were logged in before server sessions existed have no
    // session cookie yet — detect that once on startup and force a clean
    // re-login instead of silently losing all backend sync.
    const initial = useKnockAIStore.getState();
    if (initial.isAuthenticated && initial.user?.email !== 'demo@knockai.com') {
      fetch('/api/knockai/auth/me')
        .then((res) => res.json())
        .then((json) => { if (!json.authenticated) useKnockAIStore.getState().logout(); })
        .catch(() => {});
    }

    // Push local data to Redis + pull team data immediately on startup
    const s = useKnockAIStore.getState();
    if (s.isAuthenticated && s.team?.id) {
      s.pushToTeam();
      s.pollTeamData();
      // Migrate all local pins to Supabase (handles pins created before Supabase sync).
      // Batch upsert: idempotent, fire-and-forget, ensures cross-device visibility.
      if (s.pins.length > 0) {
        const pinsWithTeam = s.pins.map((p) => ({ ...p, teamId: p.teamId || s.team!.id }));
        fetch('/api/knockai/pins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pins: pinsWithTeam }),
        }).catch(() => {});
      }
    }

    // pollTeamData keeps team members, routes, dates and sale notifications in sync via Redis.
    // Pins and drawings are handled in real-time by useTeamPins / useTeamDrawings (Supabase Realtime).
    const pollInterval = setInterval(() => { useKnockAIStore.getState().pollTeamData(); }, 15000);

    return () => {
      mq.removeEventListener('change', handler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pollInterval);
    };
  }, []);

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <>
        <div style={backdrop} />
        <div style={isDesktop ? desktopAuthShell : mobileShell}>
          {authScreen === 'splash' && <SplashScreen />}
          {authScreen === 'onboarding' && <OnboardingScreen />}
          {authScreen === 'login' && <LoginScreen />}
          {authScreen === 'signup' && <SignUpScreen />}
          {authScreen === 'forgot' && <ForgotPasswordScreen />}
        </div>
      </>
    );
  }

  const TOAST_CONFIG: Record<TeamToast['type'], { borderColor: string; label: (name: string, address?: string) => string; sub: string }> = {
    clock_in:  { borderColor: '#00BFFF', label: (n) => `${n} clocked in 🟢`,    sub: 'Now active on the map' },
    clock_out: { borderColor: '#8B92A5', label: (n) => `${n} clocked out 🔴`,   sub: 'No longer visible on map' },
    sale:      { borderColor: '#22c55e', label: (n) => `💰 ${n} just made a sale!`, sub: 'New sale recorded' },
  };

  const overlays = (
    <>
      {/* Unified team broadcast toasts (clock in/out + sales) */}
      {teamToasts.length > 0 && (
        <div style={{ position: 'fixed', top: isOnline ? 12 : 44, right: 12, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
          {teamToasts.slice(0, 4).map((t) => {
            const cfg = TOAST_CONFIG[t.type];
            const initials = t.userName.split(' ').map((w) => w[0] || '').join('').substring(0, 2).toUpperCase();
            const subText = (t.type === 'sale' && t.address) ? `At ${t.address}` : cfg.sub;
            return (
              <div key={t.id} style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `4px solid ${cfg.borderColor}`, borderRadius: 8, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${cfg.borderColor}`, overflow: 'hidden', flexShrink: 0, background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.profilePhotoUrl ? (
                    <img src={t.profilePhotoUrl} alt={t.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: cfg.borderColor, fontWeight: 800, fontSize: 11 }}>{initials}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cfg.label(t.userName, t.address)}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{subText}</div>
                </div>
                <button onClick={() => setTeamToasts((p) => p.filter((x) => x.id !== t.id))} style={{ background: 'none', border: 'none', color: '#8B92A5', cursor: 'pointer', fontSize: 14, padding: 2, flexShrink: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {!isOnline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#374151', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <WifiOff size={14} /> Mode hors-ligne — les données sont sauvegardées localement
        </div>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <>
        <div style={backdrop} />
        <div style={desktopShell}>
          <BottomNav isDesktop />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'team' && <TeamScreen />}
            {activeTab === 'map' && <MapScreen realtimeStatus={realtimeStatus} />}
            {activeTab === 'settings' && <SettingsScreen />}
            <DemoTutorialOverlay />
          </div>
          {addPinModal.open && <AddPinModal />}
          {editPinModal.open && editPinModal.pin && <EditPinModal />}
          {statsModal && <StatsModal />}
        </div>
        {overlays}
      </>
    );
  }

  return (
    <>
      <div style={backdrop} />
      <div style={mobileShell}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'team' && <TeamScreen />}
          {activeTab === 'map' && <MapScreen realtimeStatus={realtimeStatus} />}
          {activeTab === 'settings' && <SettingsScreen />}
          <DemoTutorialOverlay />
        </div>
        <BottomNav />
        {addPinModal.open && <AddPinModal />}
        {editPinModal.open && editPinModal.pin && <EditPinModal />}
        {statsModal && <StatsModal />}
      </div>
      {overlays}
    </>
  );
}

const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: '#0D2B55', zIndex: 9998,
};

const mobileShell: React.CSSProperties = {
  position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column',
  background: '#1E1E2E', color: '#ffffff', overflow: 'hidden', zIndex: 9999,
  boxShadow: '0 0 60px rgba(0,0,0,0.5)',
};

const desktopShell: React.CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'row',
  background: '#1E1E2E', color: '#ffffff', overflow: 'hidden', zIndex: 9999,
};

const desktopAuthShell: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: '100%', maxWidth: '480px', height: '90vh', maxHeight: '800px',
  display: 'flex', flexDirection: 'column', background: '#1E1E2E', color: '#ffffff',
  overflow: 'hidden', zIndex: 9999, borderRadius: 24, boxShadow: '0 0 80px rgba(0,0,0,0.6)',
};
