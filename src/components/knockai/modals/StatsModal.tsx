'use client';
import { useKnockAIStore } from '@/lib/knockai/store';
import { ModalSheet } from './AddPinModal';

export default function StatsModal() {
  const { setStatsModal, pins, isClockedIn, clockInTime } = useKnockAIStore();

  const today = new Date().toDateString();
  const todayPins = pins.filter((p) => new Date(p.placedAt).toDateString() === today);
  const sales = todayPins.filter((p) => p.type === 'sale');
  const notInterested = todayPins.filter((p) => p.type === 'not_interested');
  const callBacks = todayPins.filter((p) => p.type === 'call_back');
  const aiKnocked = todayPins.filter((p) => p.type === 'ai_knocked');
  const elapsed = isClockedIn && clockInTime ? Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000) : 0;
  const salesPerHour = elapsed > 0 ? (sales.length / (elapsed / 3600)).toFixed(1) : '0.0';
  const closeRate = todayPins.length > 0 ? ((sales.length / todayPins.length) * 100).toFixed(0) : '0';

  const total = todayPins.length || 1;
  const bars = [
    { label: 'Sales', count: sales.length, color: '#10B981', pct: (sales.length / total) * 100 },
    { label: 'Not Interested', count: notInterested.length, color: '#EF4444', pct: (notInterested.length / total) * 100 },
    { label: 'Call Back', count: callBacks.length, color: '#F59E0B', pct: (callBacks.length / total) * 100 },
    { label: 'AI Knocked', count: aiKnocked.length, color: '#0066CC', pct: (aiKnocked.length / total) * 100 },
  ];

  return (
    <ModalSheet onClose={() => setStatsModal(false)} title="Today's Stats">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        <BigStat value={String(todayPins.length)} label="Doors" color="#8B5CF6" />
        <BigStat value={String(sales.length)} label="Sales" color="#10B981" />
        <BigStat value={`${salesPerHour}/h`} label="Rate" color="#1A6FD6" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <BigStat value={`${closeRate}%`} label="Close Rate" color="#F59E0B" />
        <BigStat value={String(callBacks.length)} label="Follow-ups" color="#F59E0B" />
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pin Breakdown</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {bars.map(({ label, count, color, pct }) => (
          <div key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width 0.8s ease', minWidth: count > 0 ? 4 : 0 }} />
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent Activity</h3>
      {todayPins.length === 0 ? (
        <p style={{ color: '#6B7280', textAlign: 'center', padding: '20px 0' }}>No pins placed today yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {todayPins.slice(-5).reverse().map((pin) => {
            const colors: Record<string, string> = { sale: '#10B981', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#0066CC' };
            const icons: Record<string, string> = { sale: '✓', not_interested: '✕', call_back: '?', ai_knocked: '🤖' };
            return (
              <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors[pin.type], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>{icons[pin.type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{pin.leadName || pin.address}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{new Date(pin.placedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalSheet>
  );
}

function BigStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ padding: '14px 12px', borderRadius: 12, background: `${color}15`, border: `1px solid ${color}33`, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}
