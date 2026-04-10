'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useKnockAIStore, UserRole, PinType } from '@/lib/knockai/store';

const LANG_OPTIONS = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const T: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings', profile: 'Profile', account: 'Account', preferences: 'Preferences',
    dataExport: 'Data & Export', aiInfo: 'About AI', support: 'Support & Legal',
    editName: 'Edit Name', save: 'Save', cancel: 'Cancel', logout: 'Log Out',
    language: 'Language', distUnit: 'Distance Unit', aiAssist: 'AI Assistance',
    mapTheme: 'Map Theme', dark: 'Dark', light: 'Light', km: 'Kilometers', miles: 'Miles',
    pushNotif: 'Push Notifications', chatNotif: 'Chat Notifications',
    routeNotif: 'Route Alerts', aiAlerts: 'AI Alerts',
    exportStats: 'Export Stats (Excel)', exportPins: 'Export Pins (Excel)',
    changePassword: 'Change Password', teamInfo: 'Team Info',
    inviteCode: 'Invite Code', leaveTeam: 'Leave Team', createTeam: 'Create a Team',
    joinTeam: 'Join a Team', noTeam: 'No team yet',
    tutorial: 'Tutorial', contactSupport: 'Contact Support', privacy: 'Privacy Policy',
    terms: 'Terms of Service', nameLimit: 'Name can only be changed 2 times.',
    nameCooldown: 'Wait 14 days between name changes.',
    currentPw: 'Current Password', newPw: 'New Password', confirmPw: 'Confirm Password',
    teamName: 'Team Name', teamCode: 'Invite Code', joinCode: 'Enter invite code',
    role: 'Role', member: 'Member', manager: 'Manager', owner: 'Owner',
    partnerWith: 'In partnership with',
  },
  fr: {
    settings: 'Réglages', profile: 'Profil', account: 'Compte', preferences: 'Préférences',
    dataExport: 'Données & Export', aiInfo: 'À propos de l\'IA', support: 'Support & Légal',
    editName: 'Modifier le nom', save: 'Sauvegarder', cancel: 'Annuler', logout: 'Déconnexion',
    language: 'Langue', distUnit: 'Unité de distance', aiAssist: 'Assistance IA',
    mapTheme: 'Thème de carte', dark: 'Sombre', light: 'Clair', km: 'Kilomètres', miles: 'Miles',
    pushNotif: 'Notifications Push', chatNotif: 'Notifications Chat',
    routeNotif: 'Alertes de route', aiAlerts: 'Alertes IA',
    exportStats: 'Exporter les stats (Excel)', exportPins: 'Exporter les pins (Excel)',
    changePassword: 'Changer le mot de passe', teamInfo: 'Info équipe',
    inviteCode: 'Code d\'invitation', leaveTeam: 'Quitter l\'équipe', createTeam: 'Créer une équipe',
    joinTeam: 'Rejoindre une équipe', noTeam: 'Pas d\'équipe',
    tutorial: 'Tutoriel', contactSupport: 'Contacter le support', privacy: 'Politique de confidentialité',
    terms: 'Conditions d\'utilisation', nameLimit: 'Le nom ne peut être changé que 2 fois.',
    nameCooldown: 'Attendre 14 jours entre les changements.',
    currentPw: 'Mot de passe actuel', newPw: 'Nouveau mot de passe', confirmPw: 'Confirmer le mot de passe',
    teamName: 'Nom de l\'équipe', teamCode: 'Code d\'invitation', joinCode: 'Entrer le code',
    role: 'Rôle', member: 'Membre', manager: 'Gérant', owner: 'Propriétaire',
    partnerWith: 'En partenariat avec',
  },
  es: {
    settings: 'Ajustes', profile: 'Perfil', account: 'Cuenta', preferences: 'Preferencias',
    dataExport: 'Datos & Exportar', aiInfo: 'Sobre IA', support: 'Soporte & Legal',
    editName: 'Editar nombre', save: 'Guardar', cancel: 'Cancelar', logout: 'Cerrar sesión',
    language: 'Idioma', distUnit: 'Unidad de distancia', aiAssist: 'Asistencia IA',
    mapTheme: 'Tema del mapa', dark: 'Oscuro', light: 'Claro', km: 'Kilómetros', miles: 'Millas',
    pushNotif: 'Notificaciones Push', chatNotif: 'Notificaciones Chat',
    routeNotif: 'Alertas de ruta', aiAlerts: 'Alertas IA',
    exportStats: 'Exportar stats (Excel)', exportPins: 'Exportar pins (Excel)',
    changePassword: 'Cambiar contraseña', teamInfo: 'Info del equipo',
    inviteCode: 'Código de invitación', leaveTeam: 'Dejar el equipo', createTeam: 'Crear equipo',
    joinTeam: 'Unirse a equipo', noTeam: 'Sin equipo',
    tutorial: 'Tutorial', contactSupport: 'Contactar soporte', privacy: 'Política de privacidad',
    terms: 'Términos de servicio', nameLimit: 'El nombre solo se puede cambiar 2 veces.',
    nameCooldown: 'Espera 14 días entre cambios.',
    currentPw: 'Contraseña actual', newPw: 'Nueva contraseña', confirmPw: 'Confirmar contraseña',
    teamName: 'Nombre del equipo', teamCode: 'Código de invitación', joinCode: 'Ingresa el código',
    role: 'Rol', member: 'Miembro', manager: 'Gerente', owner: 'Dueño',
    partnerWith: 'En asociación con',
  },
};

export default function SettingsScreen() {
  const {
    user, team, teamMembers, notifications, mapTheme, sessions, pins,
    updateUser, updateTeam, leaveTeam, createTeam, joinTeam,
    setNotifications, setMapTheme, logout,
  } = useKnockAIStore();

  const lang = user?.language || 'fr';
  const t = T[lang] || T.fr;

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.fullName || '');
  const [nameError, setNameError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showPinExportModal, setShowPinExportModal] = useState(false);
  const teamLogoRef = useRef<HTMLInputElement>(null);

  const handleTeamLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) updateTeam({ logoUrl: url });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [updateTeam]);

  const roleLabel: Record<UserRole, string> = { member: t.member, manager: t.manager, owner: t.owner };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !user) return;
    const changes = user.nameChangesUsed || 0;
    if (changes >= 2) { setNameError(t.nameLimit); return; }
    if (user.lastNameChangeAt) {
      const daysSince = (Date.now() - new Date(user.lastNameChangeAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) { setNameError(t.nameCooldown); return; }
    }
    updateUser({ fullName: trimmed, nameChangesUsed: changes + 1, lastNameChangeAt: new Date().toISOString() });
    setEditingName(false);
    setNameError('');
  };

  const handleExportPins = () => setShowPinExportModal(true);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0F172A', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', background: 'linear-gradient(180deg, #0D2B55 0%, #0F172A 100%)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>{t.settings}</h1>
      </div>

      {/* Profile Card */}
      <div data-tour="settings-profile" style={{ margin: '0 16px 16px', padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #1A3A6B, #0D2B55)', border: '1px solid rgba(26,111,214,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, overflow: 'hidden' }}>
            {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.5)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                  autoFocus
                />
                {nameError && <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 6 }}>{nameError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveName} style={smallBtn('#1A6FD6')}>{t.save}</button>
                  <button onClick={() => { setEditingName(false); setNameError(''); setNameInput(user?.fullName || ''); }} style={smallBtn('rgba(255,255,255,0.1)')}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {user?.fullName}
                  <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 2, fontSize: 14 }}>✏️</button>
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{user?.email}</div>
                <div style={{ marginTop: 6, display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: roleColor(user?.role || 'member'), fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {roleLabel[user?.role || 'member']}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Account Section */}
      <Section title={t.account}>
        <SettingRow label={t.changePassword} onPress={() => setShowPasswordModal(true)} />
        {team ? (
          <>
            <SettingRow label={t.teamInfo} value={team.name} />
            {/* Team Logo */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {team.logoUrl
                  ? <img src={team.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🏆'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 600 }}>Logo de l&apos;équipe</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>JPG, PNG — affiché à tous les membres</div>
              </div>
              <button onClick={() => teamLogoRef.current?.click()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(26,111,214,0.1)', color: '#1A6FD6', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Modifier
              </button>
              <input ref={teamLogoRef} type="file" accept="image/*" onChange={handleTeamLogoChange} style={{ display: 'none' }} />
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{t.inviteCode}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: '#1A6FD6', letterSpacing: 3 }}>{team.inviteCode}</div>
                <button onClick={() => navigator.clipboard?.writeText(team.inviteCode)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(26,111,214,0.1)', color: '#1A6FD6', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Copy</button>
              </div>
            </div>
            <SettingRow label={t.leaveTeam} danger onPress={() => setShowLeaveConfirm(true)} />
          </>
        ) : (
          <>
            <div style={{ padding: '10px 16px', color: '#6B7280', fontSize: 13 }}>{t.noTeam}</div>
            <SettingRow label={t.createTeam} onPress={() => setShowTeamModal(true)} />
            <SettingRow label={t.joinTeam} onPress={() => setShowTeamModal(true)} />
          </>
        )}
      </Section>

      {/* Preferences Section */}
      <div data-tour="settings-notifs"><Section title={t.preferences}>
        <ToggleRow label={t.pushNotif} value={notifications.push} onChange={(v) => setNotifications({ push: v })} />
        <ToggleRow label={t.chatNotif} value={notifications.chat} onChange={(v) => setNotifications({ chat: v })} />
        <ToggleRow label={t.routeNotif} value={notifications.routes} onChange={(v) => setNotifications({ routes: v })} />
        <ToggleRow label={t.aiAlerts} value={notifications.aiAlerts} onChange={(v) => setNotifications({ aiAlerts: v })} />

        {/* Language */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#E5E7EB' }}>{t.language}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {LANG_OPTIONS.map((l) => (
              <button key={l.code} onClick={() => updateUser({ language: l.code })} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${lang === l.code ? '#1A6FD6' : 'rgba(255,255,255,0.1)'}`, background: lang === l.code ? 'rgba(26,111,214,0.2)' : 'transparent', color: lang === l.code ? '#1A6FD6' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Distance Unit */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#E5E7EB' }}>{t.distUnit}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['km', 'miles'] as const).map((u) => (
              <button key={u} onClick={() => updateUser({ distanceUnit: u })} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${user?.distanceUnit === u ? '#1A6FD6' : 'rgba(255,255,255,0.1)'}`, background: user?.distanceUnit === u ? 'rgba(26,111,214,0.2)' : 'transparent', color: user?.distanceUnit === u ? '#1A6FD6' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {u === 'km' ? t.km : t.miles}
              </button>
            ))}
          </div>
        </div>

        {/* Map Theme */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#E5E7EB' }}>{t.mapTheme}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['light', 'dark'] as const).map((th) => (
              <button key={th} onClick={() => setMapTheme(th)} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${mapTheme === th ? '#1A6FD6' : 'rgba(255,255,255,0.1)'}`, background: mapTheme === th ? 'rgba(26,111,214,0.2)' : 'transparent', color: mapTheme === th ? '#1A6FD6' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {th === 'light' ? t.light : t.dark}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow label={t.aiAssist} value={user?.aiEnabled ?? true} onChange={(v) => updateUser({ aiEnabled: v })} />
      </Section></div>

      {/* Data & Export */}
      <Section title={t.dataExport}>
        <SettingRow label={t.exportStats} onPress={() => setShowExportModal(true)} />
        <SettingRow label={t.exportPins} onPress={handleExportPins} />
      </Section>

      {/* About AI */}
      <Section title={t.aiInfo}>
        <div style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13, lineHeight: 1.6 }}>
          KnockAI uses artificial intelligence to suggest optimal door-knocking routes, analyze your performance patterns, and predict the best times to knock in your territory. AI features use your location and historical data — all processed securely.
        </div>
      </Section>

      {/* Support */}
      <Section title={t.support}>
        <SettingRow label={t.tutorial} onPress={() => {}} />
        <SettingRow label={t.contactSupport} onPress={() => window.open('mailto:support@knockai.com')} />
        <SettingRow label={t.privacy} onPress={() => setShowPrivacy(true)} />
        <SettingRow label={t.terms} onPress={() => setShowTerms(true)} />
      </Section>

      {/* Hydrotech Card */}
      <HydrotechCard label={t.partnerWith} />

      {/* Logout */}
      <div style={{ padding: '0 16px', marginTop: 8 }}>
        <button onClick={logout} style={{ width: '100%', padding: '16px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {t.logout}
        </button>
      </div>

      {/* Version */}
      <div style={{ textAlign: 'center', padding: '20px 16px 8px', color: '#374151' }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>KnockAI v1.2</div>
        <div style={{ fontSize: 11, marginTop: 3 }}>Dernière mise à jour : 10 avril 2026</div>
      </div>

      {/* Modals */}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} t={t} />}
      {showTeamModal && <TeamJoinCreateModal onClose={() => setShowTeamModal(false)} t={t} team={team} createTeam={createTeam} joinTeam={joinTeam} />}
      {showExportModal && <ExportStatsModal onClose={() => setShowExportModal(false)} sessions={sessions} />}
      {showPinExportModal && <ExportPinsModal onClose={() => setShowPinExportModal(false)} pins={pins} />}
      {showPrivacy && <TextModal onClose={() => setShowPrivacy(false)} title={t.privacy} body={PRIVACY_TEXT} />}
      {showTerms && <TextModal onClose={() => setShowTerms(false)} title={t.terms} body={TERMS_TEXT} />}
      {showLeaveConfirm && (
        <CenteredModal onClose={() => setShowLeaveConfirm(false)} title="Leave Team?">
          <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>Your pins and sessions will be preserved. You can rejoin with an invite code.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={() => { leaveTeam(); setShowLeaveConfirm(false); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.leaveTeam}</button>
          </div>
        </CenteredModal>
      )}
    </div>
  );
}

/* ─── Sub-Components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{title}</div>
      <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, value, onPress, danger }: { label: string; value?: string; onPress?: () => void; danger?: boolean }) {
  return (
    <button onClick={onPress} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'none', border: 'none', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255,255,255,0.05)', cursor: onPress ? 'pointer' : 'default', textAlign: 'left' }}>
      <span style={{ fontSize: 14, color: danger ? '#EF4444' : '#E5E7EB' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value && <span style={{ fontSize: 13, color: '#6B7280' }}>{value}</span>}
        {onPress && <span style={{ color: '#4B5563', fontSize: 16 }}>›</span>}
      </div>
    </button>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 14, color: '#E5E7EB' }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#1A6FD6' : 'rgba(255,255,255,0.15)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

function CenteredModal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#1E293B', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input {...props} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

function PasswordModal({ onClose, t }: { onClose: () => void; t: Record<string, string> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useKnockAIStore();

  const handle = async () => {
    if (!next || next !== confirm) { setError('Passwords do not match'); return; }
    if (next.length < 6) { setError('Minimum 6 characters'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/knockai/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user?.email, currentPassword: current, newPassword: next }) });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error || 'Error'); setSaving(false); return; }
      onClose();
    } catch { setError('Network error'); setSaving(false); }
  };

  return (
    <CenteredModal onClose={onClose} title={t.changePassword}>
      <ModalInput label={t.currentPw} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <ModalInput label={t.newPw} type="password" value={next} onChange={(e) => setNext(e.target.value)} />
      <ModalInput label={t.confirmPw} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <button onClick={handle} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>{saving ? 'Saving...' : t.save}</button>
    </CenteredModal>
  );
}

function TeamJoinCreateModal({ onClose, t, team, createTeam, joinTeam }: { onClose: () => void; t: Record<string, string>; team: any; createTeam: (name: string) => Promise<void>; joinTeam: (code: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [mode, setMode] = useState<'pick' | 'create' | 'join'>('pick');
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    await createTeam(teamName.trim());
    setLoading(false);
    onClose();
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    const res = await joinTeam(joinCode.trim().toUpperCase());
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Invalid code'); return; }
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} title={mode === 'create' ? t.createTeam : mode === 'join' ? t.joinTeam : 'Team'}>
      {mode === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setMode('create')} style={{ padding: '16px', borderRadius: 12, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(26,111,214,0.1)', color: '#1A6FD6', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>{t.createTeam}</button>
          <button onClick={() => setMode('join')} style={{ padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#E5E7EB', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>{t.joinTeam}</button>
        </div>
      )}
      {mode === 'create' && (
        <>
          <ModalInput label={t.teamName} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Alpha Squad" />
          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('pick')} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={handleCreate} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : t.save}</button>
          </div>
        </>
      )}
      {mode === 'join' && (
        <>
          <ModalInput label={t.joinCode} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. KNK7X2" />
          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('pick')} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={handleJoin} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : t.joinTeam}</button>
          </div>
        </>
      )}
    </CenteredModal>
  );
}

function ExportStatsModal({ onClose, sessions }: { onClose: () => void; sessions: any[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleExport = () => {
    let filtered = sessions;
    if (from) filtered = filtered.filter((s) => new Date(s.clockInAt) >= new Date(from));
    if (to) filtered = filtered.filter((s) => new Date(s.clockInAt) <= new Date(to + 'T23:59:59'));

    const rows = [
      ['Date', 'Clock In', 'Clock Out', 'Duration (min)', 'Doors Knocked', 'Sales Made', 'Distance (m)'],
      ...filtered.map((s) => [
        s.date,
        new Date(s.clockInAt).toLocaleTimeString(),
        s.clockOutAt ? new Date(s.clockOutAt).toLocaleTimeString() : '',
        Math.round((s.durationSeconds || 0) / 60),
        s.doorsKnocked,
        s.salesMade,
        Math.round(s.distanceMeters),
      ]),
    ];

    downloadExcel(rows, 'KnockAI Stats', 'knockai-stats.xlsx');
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} title="Export Stats">
      <ModalInput label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <ModalInput label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <button onClick={handleExport} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span>📊</span> Télécharger Excel (.xlsx)
      </button>
    </CenteredModal>
  );
}

/* ─── Pin Filter Options ─── */

const PIN_FILTER_OPTIONS: { value: PinType | 'all'; label: string; emoji: string; color: string }[] = [
  { value: 'all',            label: 'Tous les pins',    emoji: '📍', color: '#6B7280' },
  { value: 'sale',           label: 'Ventes',           emoji: '✓',  color: '#34D399' },
  { value: 'not_interested', label: 'Non intéressés',   emoji: '✕',  color: '#EF4444' },
  { value: 'call_back',      label: 'Rappels',          emoji: '?',  color: '#F59E0B' },
  { value: 'ai_knocked',     label: 'IA Knocké',        emoji: '🤖', color: '#3B82F6' },
];

const PIN_TYPE_LABELS: Record<string, string> = {
  sale: 'Vente',
  not_interested: 'Non intéressé',
  call_back: 'Rappel',
  ai_knocked: 'IA Knocké',
};

function ExportPinsModal({ onClose, pins }: { onClose: () => void; pins: any[] }) {
  const [filter, setFilter] = useState<PinType | 'all'>('all');

  const filteredPins = filter === 'all' ? pins : pins.filter((p) => p.type === filter);
  const count = filteredPins.length;

  const handleExport = () => {
    const rows = [
      ['Date', 'Heure', 'Type', 'Adresse', 'Latitude', 'Longitude', 'Nom du lead', 'Notes'],
      ...filteredPins.map((p) => {
        const d = new Date(p.placedAt);
        return [
          d.toLocaleDateString('fr-CA'),
          d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }),
          PIN_TYPE_LABELS[p.type] || p.type,
          p.address,
          p.lat,
          p.lng,
          p.leadName || '',
          p.notes || '',
        ];
      }),
    ];

    const label = filter === 'all' ? 'Tous' : PIN_TYPE_LABELS[filter] || filter;
    downloadExcel(rows, `Pins - ${label}`, `knockai-pins-${filter}.xlsx`);
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} title="Exporter les pins">
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>
        Choisissez quels pins exporter :
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {PIN_FILTER_OPTIONS.map((opt) => {
          const selected = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${selected ? opt.color : 'rgba(255,255,255,0.08)'}`,
                background: selected ? `${opt.color}18` : 'rgba(255,255,255,0.03)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: opt.color, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: opt.value === 'all' ? 16 : 14,
                fontWeight: 900, color: '#fff',
              }}>
                {opt.emoji}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: selected ? '#fff' : '#D1D5DB', textAlign: 'left' }}>
                {opt.label}
              </span>
              {selected && (
                <span style={{ fontSize: 16, color: opt.color }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', marginBottom: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
        {count === 0
          ? 'Aucun pin à exporter pour ce filtre'
          : `${count} pin${count > 1 ? 's' : ''} sera${count > 1 ? 'ont' : ''} exporté${count > 1 ? 's' : ''}`}
      </div>

      <button
        onClick={handleExport}
        disabled={count === 0}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: count === 0 ? '#374151' : 'linear-gradient(135deg, #1A6FD6, #3B82F6)',
          color: '#fff', fontWeight: 700, cursor: count === 0 ? 'default' : 'pointer',
          fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <span>📥</span> Télécharger Excel (.xlsx)
      </button>
    </CenteredModal>
  );
}

function TextModal({ onClose, title, body }: { onClose: () => void; title: string; body: string }) {
  return (
    <CenteredModal onClose={onClose} title={title}>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', color: '#9CA3AF', fontSize: 13, lineHeight: 1.7 }}>{body}</div>
    </CenteredModal>
  );
}

function HydrotechCard({ label }: { label: string }) {
  return (
    <div style={{ margin: '16px 16px 0', padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>💧</div>
      <div>
        <div style={{ fontSize: 10, color: '#6EE7B7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Hydrotech</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>Water solutions partner</div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function roleColor(role: UserRole) {
  if (role === 'owner') return '#7C3AED';
  if (role === 'manager') return '#1A6FD6';
  return '#374151';
}

function smallBtn(bg: string): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}

function downloadExcel(rows: (string | number)[][], sheetName: string, filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
}

const PRIVACY_TEXT = `KnockAI — Privacy Policy
Version 1.2 | Last updated: April 8, 2026

KnockAI is a door-to-door sales management platform. We take your privacy seriously. This policy explains what data we collect, how we use it, and your rights.

1. DATA WE COLLECT
• Location data (GPS) — used to display your position on the map and generate walking trails while you are clocked in.
• Activity data — doors knocked, sales made, call-backs, sessions (clock-in/out times, duration, distance).
• Team data — team name, invite codes, member roles, chat messages, and shared routes.
• Account data — your name, email address, and profile photo.
• Device data — browser type and approximate time zone, for session management only.

2. HOW WE USE YOUR DATA
• To power real-time team features (live map, member status, leaderboard).
• To generate AI-powered territory suggestions based on your knock history.
• To produce performance analytics (stats, session history, exports).
• To synchronize your data across devices via secure cloud storage (Upstash Redis).

3. DATA STORAGE & SECURITY
All data is encrypted in transit (HTTPS/TLS) and at rest. We use Upstash Redis hosted in a SOC 2-compliant environment. Local data is also stored in your browser (localStorage) for offline functionality.

4. DATA RETENTION
Your data is retained for as long as your account is active. You can export your data at any time from Settings → Data & Export. You may request full deletion by contacting support@knockai.com.

5. THIRD PARTIES
We do not sell, rent, or share your personal data with third parties for advertising. We use Upstash (cloud storage) as a sub-processor — they are bound by a data processing agreement.

6. YOUR RIGHTS
You have the right to access, correct, export, or delete your personal data at any time. Contact privacy@knockai.com to exercise these rights.

7. CHILDREN
KnockAI is intended for professional use only and is not directed at users under the age of 16.

8. CHANGES TO THIS POLICY
We will notify users of material changes via in-app notification. Continued use of the app constitutes acceptance of the updated policy.

9. CONTACT
For privacy questions: privacy@knockai.com`;


const TERMS_TEXT = `KnockAI — Terms of Service
Version 1.2 | Last updated: April 8, 2026

Please read these Terms of Service carefully before using KnockAI. By accessing or using the app, you agree to be bound by these terms.

1. ACCEPTANCE OF TERMS
By creating an account or using KnockAI (the "App"), you confirm that you have read, understood, and agree to these Terms. If you do not agree, do not use the App.

2. DESCRIPTION OF SERVICE
KnockAI is a professional platform designed for door-to-door sales teams. It provides tools for session tracking, map-based pin logging, team management, real-time communication, and AI-assisted territory optimization.

3. ELIGIBILITY
You must be at least 16 years old and authorized by your employer or organization to use KnockAI. The App is intended for professional business use only.

4. USER ACCOUNTS
You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately at support@knockai.com if you suspect unauthorized access to your account. We reserve the right to suspend accounts that show signs of abuse or unauthorized activity.

5. ACCEPTABLE USE
You agree not to:
• Use the App for any unlawful purpose or in violation of local regulations.
• Harass, threaten, or harm other users through the team chat or any other feature.
• Attempt to reverse-engineer, decompile, or interfere with the App's infrastructure.
• Upload content that is offensive, defamatory, or infringes third-party intellectual property rights.

6. DATA OWNERSHIP
You own the data you input into KnockAI (pins, sessions, notes, etc.). By using the App, you grant KnockAI a limited license to process and store that data solely to provide the service described above.

7. AI FEATURES
KnockAI includes AI-powered territory suggestions based on your historical activity. These suggestions are informational only and do not guarantee sales outcomes. KnockAI makes no warranty as to the accuracy or profitability of AI recommendations.

8. INTELLECTUAL PROPERTY
KnockAI and all associated branding, design, and code are the intellectual property of KnockAI and its licensors. You may not copy, reproduce, or distribute any part of the App without prior written consent.

9. DISCLAIMER OF WARRANTIES
The App is provided "as-is" without warranties of any kind, express or implied. We do not warrant that the App will be uninterrupted, error-free, or free of viruses. We are not liable for any sales outcomes, lost commissions, or business losses resulting from use of the App.

10. LIMITATION OF LIABILITY
To the maximum extent permitted by applicable law, KnockAI's total liability for any claim arising from use of the App shall not exceed the amount paid by you (if any) in the 12 months preceding the claim.

11. TERMINATION
We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting support@knockai.com.

12. CHANGES TO TERMS
We may update these Terms from time to time. Material changes will be communicated via in-app notification. Continued use of the App after changes take effect constitutes acceptance of the new Terms.

13. GOVERNING LAW
These Terms are governed by the laws of the Province of Quebec, Canada, without regard to conflict of law principles.

14. CONTACT
For legal inquiries: legal@knockai.com`;
