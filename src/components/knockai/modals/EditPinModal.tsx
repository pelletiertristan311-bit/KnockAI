'use client';
import { useState } from 'react';
import { useKnockAIStore, PinType } from '@/lib/knockai/store';
import { ModalSheet } from './AddPinModal';
import { getPinT } from '@/lib/knockai/pinTranslations';

const PIN_COLORS: Record<PinType, string> = { sale: '#34D399', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#3B82F6', quote: '#A855F7', business_card: '#14B8A6' };
const PIN_ICONS: Record<PinType, string> = { sale: '$', not_interested: '✕', call_back: '?', ai_knocked: 'AI', quote: '"', business_card: '📇' };

export default function EditPinModal() {
  const { editPinModal, closeEditPinModal, updatePin, deletePin, user } = useKnockAIStore();
  const t = getPinT(user?.language);
  const PIN_LABELS: Record<PinType, string> = { sale: t.typeSale, not_interested: t.typeNotInterested, call_back: t.typeCallBack, ai_knocked: t.typeAiKnocked, quote: t.typeQuote, business_card: t.typeBusinessCard };
  const pin = editPinModal.pin!;
  const [type, setType] = useState<PinType>(pin.type);
  const [leadName, setLeadName] = useState(pin.leadName || '');
  const [phone, setPhone] = useState(pin.phone || '');
  const [notes, setNotes] = useState(pin.notes || '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const placedBy = pin.placedByAi ? `🤖 ${t.aiPlaced}` : (pin.placedByName || t.unknown);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      updatePin(pin.id, { type, leadName: leadName || undefined, phone: phone || undefined, notes: notes || undefined });
      closeEditPinModal();
    }, 400);
  };

  const handleDelete = () => { deletePin(pin.id); closeEditPinModal(); };

  return (
    <ModalSheet onClose={closeEditPinModal} title={t.editPinTitle}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {(Object.keys(PIN_COLORS) as PinType[]).map((pt) => (
          <button key={pt} onClick={() => setType(pt)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 20, border: `2px solid ${type === pt ? PIN_COLORS[pt] : 'rgba(255,255,255,0.1)'}`, background: type === pt ? `${PIN_COLORS[pt]}22` : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: type === pt ? PIN_COLORS[pt] : '#9CA3AF', transition: 'all 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: PIN_COLORS[pt], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: pt === 'ai_knocked' ? 7 : 11, fontWeight: 800 }}>{PIN_ICONS[pt]}</div>
            {PIN_LABELS[pt]}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MetaRow label={t.address} value={pin.address} />
        <MetaRow label={t.placedAt} value={new Date(pin.placedAt).toLocaleString()} />
        <MetaRow label={t.placedBy} value={placedBy} />
        <MetaRow label={t.coords} value={`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{t.leadName}</label>
        <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. Carole Tremblay" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{t.phone}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="e.g. 415-555-0101" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>{t.notes}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} rows={3} style={{ ...inputStyle, resize: 'none' }} />
      </div>

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(90deg, ${PIN_COLORS[type]}, ${PIN_COLORS[type]}bb)`, color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
        {saving ? t.saving : t.save}
      </button>
      <button onClick={() => setConfirmingDelete(true)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        {t.deletePin}
      </button>

      {confirmingDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setConfirmingDelete(false)}>
          <div style={{ width: '100%', maxWidth: 340, background: '#1E293B', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{t.deleteConfirmTitle}</h3>
            <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5, margin: '0 0 20px' }}>{t.deleteConfirmBody}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmingDelete(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer', fontSize: 14 }}>{t.cancel}</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>{t.deletePin}</button>
            </div>
          </div>
        </div>
      )}
    </ModalSheet>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: '#8B92A5', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#9CA3AF', maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</span>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' };
