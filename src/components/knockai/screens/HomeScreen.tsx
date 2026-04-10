'use client';
import { useEffect, useState, useRef } from 'react';
import { useKnockAIStore } from '@/lib/knockai/store';

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const MOTIVATIONAL_MESSAGES = [
  "Let's crush today's targets! 💪",
  "Every door is an opportunity! 🚀",
  "Your best sale is next! ⚡",
  "Keep knocking, keep winning! 🏆",
  "The grind pays off! 💰",
  "Stay consistent, stay unstoppable! 🔥",
];

const PIN_COLORS: Record<string, string> = { sale: '#34D399', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#3B82F6' };
const PIN_ICONS: Record<string, string> = { sale: '✓', not_interested: '✕', call_back: '?', ai_knocked: '🤖' };
const PIN_LABELS: Record<string, string> = { sale: 'Sale', not_interested: 'Not Interested', call_back: 'Call Back', ai_knocked: 'AI Knocked' };

export default function HomeScreen() {
  const { user, isClockedIn, isPaused, clockInTime, accumulatedSeconds, clockIn, clockOut, pins, sessions, setActiveTab, setSettingsSection, openAddPinModal, openEditPinModal, dailyGoals, setDailyGoals } = useKnockAIStore();
  const [elapsed, setElapsed] = useState(() => {
    if (!isClockedIn) return 0;
    if (isPaused || !clockInTime) return accumulatedSeconds;
    return accumulatedSeconds + Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
  });
  const [msgIndex, setMsgIndex] = useState(0);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const msgRef = useRef(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    if (!isClockedIn) { setElapsed(0); return; }
    if (isPaused || !clockInTime) { setElapsed(accumulatedSeconds); return; }
    const update = () => {
      const currentSecs = Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
      setElapsed(accumulatedSeconds + currentSecs);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, isPaused, clockInTime, accumulatedSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      msgRef.current = (msgRef.current + 1) % MOTIVATIONAL_MESSAGES.length;
      setMsgIndex(msgRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toDateString();
  const todayDateKey = new Date().toISOString().split('T')[0];
  const todayPins = pins.filter((p) => new Date(p.placedAt).toDateString() === today);
  const doorsToday = pins.filter((p) => p.placedAt.startsWith(todayDateKey)).length;
  const salesToday = pins.filter((p) => p.placedAt.startsWith(todayDateKey) && p.type === 'sale').length;
  const todaySales = todayPins.filter((p) => p.type === 'sale').length;

  const todayCompletedSeconds = sessions
    .filter((s) => s.userId === user?.id && s.date === todayDateKey && s.clockOutAt)
    .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const timeWorkedToday = todayCompletedSeconds + (isClockedIn ? elapsed : 0);
  const salesPerHour = timeWorkedToday > 0 ? (todaySales / (timeWorkedToday / 3600)).toFixed(1) : '0.0';
  const startTimeLabel = clockInTime
    ? `Start: ${new Date(clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    : isPaused ? 'Paused' : '';

  const goToSettings = (section: string) => { setSettingsSection(section); setActiveTab('settings'); };

  const quickActions = [
    { label: 'Add Pin', icon: '📍', action: () => openAddPinModal() },
    { label: 'Go to Map', icon: '🗺️', action: () => setActiveTab('map') },
    { label: 'View Stats', icon: '📊', action: () => goToSettings('stats') },
    { label: 'Team Chat', icon: '💬', action: () => setActiveTab('team') },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#1E1E2E' }}>
      <div style={{ background: '#0D2B55', padding: `${isDesktop ? 16 : 48}px 16px 20px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#9CA3AF', fontSize: 13 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Hey, {user?.fullName?.split(' ')?.[0] || 'there'}!</h1>
            <p style={{ fontSize: 13, color: '#00B4D8', marginTop: 2, minHeight: 18 }}>{MOTIVATIONAL_MESSAGES[msgIndex]}</p>
          </div>
          <button onClick={() => goToSettings('profile')} style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', flexShrink: 0, padding: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)' }}>
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                {user?.fullName.charAt(0) || '?'}
              </div>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        <div style={{ marginBottom: 20 }} data-tour="clock-btn">
          <button
            onClick={isClockedIn ? clockOut : clockIn}
            style={{ width: '100%', padding: '18px', borderRadius: 16, border: 'none', cursor: 'pointer', background: isClockedIn ? 'linear-gradient(90deg, #EF4444, #DC2626)' : 'linear-gradient(90deg, #10B981, #059669)', color: '#fff', boxShadow: isClockedIn ? '0 4px 24px rgba(239,68,68,0.4)' : '0 4px 24px rgba(16,185,129,0.4)', transition: 'all 0.3s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{isClockedIn ? '⏹' : '▶'}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}</div>
                {isClockedIn && <div style={{ fontSize: 15, fontFamily: 'monospace', letterSpacing: 2, opacity: 0.9 }}>{formatTime(elapsed)}</div>}
                {!isClockedIn && <div style={{ fontSize: 13, opacity: 0.8 }}>Tap to start your shift</div>}
              </div>
            </div>
          </button>
          {isClockedIn && startTimeLabel && <div style={{ textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 6 }}>{startTimeLabel}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }} data-tour="home-stats">
          <StatCard icon="⏱" label="Time Worked" value={formatTime(timeWorkedToday)} color="#0D2B55" />
          <StatCard icon="🚪" label="Doors Knocked" value={String(todayPins.length)} color="#8B5CF6" />
          <StatCard icon="💰" label="Sales Made" value={String(todaySales)} color="#10B981" />
          <StatCard icon="🎯" label="Sales/hr" value={salesPerHour} color="#EF4444" />
        </div>

        <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }} data-tour="home-quick">
          {quickActions.map(({ label, icon, action }) => (
            <button key={label} onClick={action} style={{ padding: '16px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>

        <div style={{ margin: '0 0 24px' }} data-tour="home-goals">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Objectifs du jour</span>
            <button onClick={() => setShowGoalEditor(true)} style={{ fontSize: 11, color: '#1A6FD6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Modifier</button>
          </div>
          <GoalBar label="Portes" current={doorsToday} target={dailyGoals.doors} color="#8B5CF6" icon="🚪" />
          <GoalBar label="Ventes" current={salesToday} target={dailyGoals.sales} color="#10B981" icon="💰" />
          {doorsToday >= dailyGoals.doors && salesToday >= dailyGoals.sales && dailyGoals.doors > 0 && (
            <div style={{ textAlign: 'center', padding: '12px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginTop: 8, fontSize: 13, fontWeight: 700, color: '#10B981' }}>
              🎉 Objectifs atteints ! Excellent travail !
            </div>
          )}
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Pins</h3>
        {todayPins.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayPins.slice(-5).reverse().map((pin) => (
              <button key={pin.id} onClick={() => openEditPinModal(pin)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: PIN_COLORS[pin.type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {PIN_ICONS[pin.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{pin.leadName || pin.address}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{new Date(pin.placedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: 12, color: PIN_COLORS[pin.type], fontWeight: 600 }}>{PIN_LABELS[pin.type]}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showGoalEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowGoalEditor(false)}>
          <div style={{ width: '100%', maxWidth: 430, background: '#0D2B55', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Objectifs du jour</div>
            <GoalInput label="🚪 Objectif portes" value={dailyGoals.doors} onChange={v => setDailyGoals({ ...dailyGoals, doors: v })} />
            <GoalInput label="💰 Objectif ventes" value={dailyGoals.sales} onChange={v => setDailyGoals({ ...dailyGoals, sales: v })} />
            <button onClick={() => setShowGoalEditor(false)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#1A6FD6,#00B4D8)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '16px', borderRadius: 16, background: `${color}cc`, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function EmptyState() {
  const { setActiveTab } = useKnockAIStore();
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
      <p style={{ color: '#9CA3AF', fontSize: 15, marginBottom: 16 }}>No pins yet today. Drop your first pin on the map!</p>
      <button onClick={() => setActiveTab('map')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1A6FD6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Open Map</button>
    </div>
  );
}

function GoalBar({ label, current, target, color, icon }: { label: string; current: number; target: number; color: string; icon: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#D1D5DB' }}>{icon} {label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{current} / {target}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>−</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 24, fontWeight: 800 }}>{value}</span>
        <button onClick={() => onChange(value + 1)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}
