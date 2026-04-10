'use client';
import { useEffect, useState } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';
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
  const { isAuthenticated, authScreen, activeTab, addPinModal, editPinModal, statsModal, isOnline, setOnline, saleNotifications, dismissSaleNotification, pollTeamData } = useKnockAIStore();
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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
        fetch('/api/knockai/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: s.user.email, userData: { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user } }) }).catch(() => {});
      }
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

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

  const overlays = (
    <>
      {!isOnline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999, background: '#374151', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>📵</span> Mode hors-ligne — les données sont sauvegardées localement
        </div>
      )}
      {saleNotifications.length > 0 && (
        <div style={{ position: 'fixed', top: isOnline ? 12 : 44, right: 12, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
          {saleNotifications.slice(0, 3).map((n) => (
            <div key={n.id} style={{ background: 'linear-gradient(135deg, #064E3B, #065F46)', border: '1px solid #10B981', borderRadius: 14, padding: '12px 16px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>🎉</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{n.memberName} a fait une vente !</div>
                <div style={{ fontSize: 11, color: '#6EE7B7', marginTop: 2 }}>Il y a quelques secondes</div>
              </div>
              <button onClick={() => dismissSaleNotification(n.id)} style={{ background: 'none', border: 'none', color: '#6EE7B7', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
            </div>
          ))}
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
            {activeTab === 'map' && <MapScreen />}
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
          {activeTab === 'map' && <MapScreen />}
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
