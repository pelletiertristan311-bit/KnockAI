'use client';
import { useState } from 'react';
import { useKnockAIStore, PinType } from '@/lib/knockai/store';
import { ModalSheet } from './AddPinModal';

const PIN_COLORS: Record<PinType, string> = { sale: '#34D399', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#3B82F6' };
const PIN_LABELS: Record<PinType, string> = { sale: 'Sale', not_interested: 'Not Interested', call_back: 'Call Back', ai_knocked: 'AI Knocked' };
const PIN_ICONS: Record<PinType, string> = { sale: '✓', not_interested: '✕', call_back: '?', ai_knocked: 'AI' };

export default function EditPinModal() {
  const { editPinModal, closeEditPinModal, updatePin, deletePin } = useKnockAIStore();
  const pin = editPinModal.pin!;
  const [type, setType] = useState<PinType>(pin.type);
  const [leadName, setLeadName] = useState(pin.leadName || '');
  const [phone, setPhone] = useState(pin.phone || '');
  const [notes, setNotes] = useState(pin.notes || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const placedBy = pin.placedByAi ? '🤖 AI' : (pin.placedByName || 'Unknown');

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      updatePin(pin.id, { type, leadName: leadName || undefined, phone: phone || undefined, notes: notes || undefined });
      closeEditPinModal();
    }, 400);
  };

  const handleDelete = () => { deletePin(pin.id); closeEditPinModal(); };

  return (
    <ModalSheet onClose={closeEditPinModal} title="Edit Pin">
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(Object.keys(PIN_COLORS) as PinType[]).map((t) => (
          <button key={t} onClick={() => setType(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, border: `2px solid ${type === t ? PIN_COLORS[t] : 'rgba(255,255,255,0.1)'}`, background: type === t ? `${PIN_COLORS[t]}22` : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: type === t ? PIN_COLORS[t] : '#9CA3AF', transition: 'all 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: PIN_COLORS[t], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: t === 'ai_knocked' ? 7 : 11, fontWeight: 800 }}>{PIN_ICONS[t]}</div>
            {PIN_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MetaRow label="Address" value={pin.address} />
        <MetaRow label="Placed at" value={new Date(pin.placedAt).toLocaleString()} />
        <MetaRow label="Placed by" value={placedBy} />
        <MetaRow label="Coords" value={`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Lead Name</label>
        <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. Carole Tremblay" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="e.g. 415-555-0101" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this visit..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
      </div>

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(90deg, ${PIN_COLORS[type]}, ${PIN_COLORS[type]}bb)`, color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
      <button onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        Delete Pin
      </button>

      {showDeleteConfirm && (
        <div style={{ marginTop: 12, padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>Delete this pin permanently?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#9CA3AF', maxWidth: '60%', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' };
