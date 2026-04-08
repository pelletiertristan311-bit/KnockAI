'use client';
import { useState, useEffect } from 'react';
import { useKnockAIStore, PinType } from '@/lib/knockai/store';

const PIN_TYPES: { type: PinType; label: string; color: string; icon: string; desc: string }[] = [
  { type: 'sale', label: 'Sale', color: '#34D399', icon: '✓', desc: 'Deal confirmed' },
  { type: 'not_interested', label: 'Not Interested', color: '#EF4444', icon: '✕', desc: 'Said no' },
  { type: 'call_back', label: 'Call Back', color: '#F59E0B', icon: '?', desc: 'Follow up needed' },
  { type: 'ai_knocked', label: 'AI Knocked', color: '#3B82F6', icon: 'AI', desc: 'AI placed marker' },
];

export default function AddPinModal() {
  const { closeAddPinModal, addPin, addPinModal, userLocation } = useKnockAIStore();
  const [selectedType, setSelectedType] = useState<PinType>('sale');
  const [leadName, setLeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const lat = addPinModal.lat ?? userLocation?.lat ?? 37.7751;
    const lng = addPinModal.lng ?? userLocation?.lng ?? -122.418;
    let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'fr', 'User-Agent': 'KnockAI/1.0' } });
      const data = await res.json();
      const a = data.address || {};
      const parts = [a.house_number, a.road || a.street, a.city || a.town || a.village || a.municipality].filter(Boolean);
      if (parts.length > 0) address = parts.join(' ');
      else if (data.display_name) address = data.display_name.split(',')[0];
    } catch {}
    addPin({ lat, lng, address, type: selectedType, leadName: leadName || undefined, phone: phone || undefined, notes: notes || undefined, placedByAi: false, teamId: useKnockAIStore.getState().team?.id });
    closeAddPinModal();
  };

  const pinInfo = PIN_TYPES.find((p) => p.type === selectedType)!;

  return (
    <ModalSheet onClose={closeAddPinModal} title="Add Pin">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {PIN_TYPES.map(({ type, label, color, icon, desc }) => (
          <button key={type} onClick={() => setSelectedType(type)} style={{ padding: '12px', borderRadius: 12, border: `2px solid ${selectedType === type ? color : 'rgba(255,255,255,0.08)'}`, background: selectedType === type ? `${color}22` : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: type === 'ai_knocked' ? 9 : 14 }}>{icon}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: selectedType === type ? color : '#fff' }}>{label}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{desc}</div>
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Lead Name (optional)</label>
        <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. Carole Tremblay" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Phone Number (optional)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="e.g. 415-555-0101" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this visit..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(90deg, ${pinInfo.color}, ${pinInfo.color}bb)`, color: '#fff', fontSize: 16, fontWeight: 700 }}>
        {saving ? 'Saving...' : `Save ${pinInfo.label} Pin`}
      </button>
    </ModalSheet>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' };

export function ModalSheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)', padding: isDesktop ? 24 : 0 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: isDesktop ? 520 : 430, background: '#0D2B55', borderRadius: isDesktop ? 24 : '24px 24px 0 0', padding: isDesktop ? '28px 28px 32px' : '8px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {!isDesktop && <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '12px auto 20px' }} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: isDesktop ? 0 : 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
