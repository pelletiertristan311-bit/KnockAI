'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useKnockAIStore, UserRole, PinType, TrashedPin, TrashedTeam } from '@/lib/knockai/store';

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
    changePassword: 'Change Password', teamInfo: 'Team', teamSection: 'Team',
    inviteCode: 'Invite Code', leaveTeam: 'Leave Team', createTeam: 'Create a Team',
    joinTeam: 'Join a Team', noTeam: 'No team yet',
    tutorial: 'Tutorial', contactSupport: 'Contact Support', privacy: 'Privacy Policy',
    terms: 'Terms of Service', nameLimit: 'Name can only be changed 2 times.',
    nameCooldown: 'Wait 14 days between name changes.',
    currentPw: 'Current Password', newPw: 'New Password', confirmPw: 'Confirm Password',
    teamName: 'Team Name', teamCode: 'Invite Code', joinCode: 'Enter invite code',
    role: 'Role', member: 'Member', manager: 'Manager', owner: 'Owner',
    partnerWith: 'In partnership with', trash: 'Recycle Bin', trashTeams: 'Teams', trashPins: 'Pins',
    restore: 'Restore', deletedOn: 'Deleted on', daysLeft: 'days left', emptyTrash: 'Recycle bin is empty',
    deleteTeam: 'Delete Team', transferOwner: 'Transfer Ownership', myAccount: 'My Account',
    shareLocation: 'Share my location', showMemberTrails: 'See member trails',
    salesNotif: 'Sales notifications', dailyGoalSync: 'Sync daily goals',
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
    changePassword: 'Changer le mot de passe', teamInfo: 'Équipe', teamSection: 'Équipe',
    inviteCode: 'Code d\'invitation', leaveTeam: 'Quitter l\'équipe', createTeam: 'Créer une équipe',
    joinTeam: 'Rejoindre une équipe', noTeam: 'Pas d\'équipe',
    tutorial: 'Tutoriel', contactSupport: 'Contacter le support', privacy: 'Politique de confidentialité',
    terms: 'Conditions d\'utilisation', nameLimit: 'Le nom ne peut être changé que 2 fois.',
    nameCooldown: 'Attendre 14 jours entre les changements.',
    currentPw: 'Mot de passe actuel', newPw: 'Nouveau mot de passe', confirmPw: 'Confirmer le mot de passe',
    teamName: 'Nom de l\'équipe', teamCode: 'Code d\'invitation', joinCode: 'Entrer le code',
    role: 'Rôle', member: 'Membre', manager: 'Gérant', owner: 'Propriétaire',
    partnerWith: 'En partenariat avec', trash: 'Corbeille', trashTeams: 'Équipes', trashPins: 'Pins',
    restore: 'Restaurer', deletedOn: 'Supprimé le', daysLeft: 'jours restants', emptyTrash: 'La corbeille est vide',
    deleteTeam: 'Supprimer l\'équipe', transferOwner: 'Transférer la propriété', myAccount: 'Mon Compte',
    shareLocation: 'Partager ma position', showMemberTrails: 'Voir les traces des membres',
    salesNotif: 'Notif. de ventes d\'équipe', dailyGoalSync: 'Synchroniser les objectifs',
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
    changePassword: 'Cambiar contraseña', teamInfo: 'Equipo', teamSection: 'Equipo',
    inviteCode: 'Código de invitación', leaveTeam: 'Dejar el equipo', createTeam: 'Crear equipo',
    joinTeam: 'Unirse a equipo', noTeam: 'Sin equipo',
    tutorial: 'Tutorial', contactSupport: 'Contactar soporte', privacy: 'Política de privacidad',
    terms: 'Términos de servicio', nameLimit: 'El nombre solo se puede cambiar 2 veces.',
    nameCooldown: 'Espera 14 días entre cambios.',
    currentPw: 'Contraseña actual', newPw: 'Nueva contraseña', confirmPw: 'Confirmar contraseña',
    teamName: 'Nombre del equipo', teamCode: 'Código de invitación', joinCode: 'Ingresa el código',
    role: 'Rol', member: 'Miembro', manager: 'Gerente', owner: 'Dueño',
    partnerWith: 'En asociación con', trash: 'Papelera', trashTeams: 'Equipos', trashPins: 'Pins',
    restore: 'Restaurar', deletedOn: 'Eliminado el', daysLeft: 'días restantes', emptyTrash: 'Papelera vacía',
    deleteTeam: 'Eliminar equipo', transferOwner: 'Transferir propiedad', myAccount: 'Mi Cuenta',
    shareLocation: 'Compartir ubicación', showMemberTrails: 'Ver huellas de miembros',
    salesNotif: 'Notif. de ventas', dailyGoalSync: 'Sincronizar objetivos',
  },
};

/* ══════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════ */

export default function SettingsScreen() {
  const {
    user, team, teamMembers, notifications, mapTheme, sessions, pins,
    trashedPins, trashedTeams, teamSettings,
    updateUser, updateTeam, leaveTeam, deleteTeam, createTeam, joinTeam,
    restorePin, restoreTeam, setTeamSettings,
    setNotifications, setMapTheme, logout,
  } = useKnockAIStore();

  const lang = user?.language || 'fr';
  const t = T[lang] || T.fr;

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPinExportModal, setShowPinExportModal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#0F172A', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', background: 'linear-gradient(180deg, #0D2B55 0%, #0F172A 100%)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>{t.settings}</h1>
      </div>

      {/* Profile Card */}
      <ProfileCard user={user} t={t} onAccountPress={() => setShowAccountModal(true)} />

      {/* Daily Stats Section */}
      <DailyStatsSection lang={lang} />

      {/* Team Section */}
      <TeamCard
        user={user} team={team} teamMembers={teamMembers}
        updateTeam={updateTeam} leaveTeam={leaveTeam} deleteTeam={deleteTeam}
        createTeam={createTeam} joinTeam={joinTeam}
        teamSettings={teamSettings} setTeamSettings={setTeamSettings}
        t={t}
      />

      {/* Preferences */}
      <div data-tour="settings-notifs">
        <Section title={t.preferences}>
          <ToggleRow label={t.pushNotif} value={notifications.push} onChange={(v) => setNotifications({ push: v })} />
          <ToggleRow label={t.chatNotif} value={notifications.chat} onChange={(v) => setNotifications({ chat: v })} />
          <ToggleRow label={t.routeNotif} value={notifications.routes} onChange={(v) => setNotifications({ routes: v })} />
          <ToggleRow label={t.aiAlerts} value={notifications.aiAlerts} onChange={(v) => setNotifications({ aiAlerts: v })} />
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
        </Section>
      </div>

      {/* Data & Export */}
      <Section title={t.dataExport}>
        <SettingRow label={t.exportStats} onPress={() => setShowExportModal(true)} />
        <SettingRow label={t.exportPins} onPress={() => setShowPinExportModal(true)} />
      </Section>

      {/* About AI */}
      <Section title={t.aiInfo}>
        <div style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 13, lineHeight: 1.6 }}>
          KnockAI uses artificial intelligence to suggest optimal door-knocking routes, analyze your performance patterns, and predict the best times to knock in your territory. AI features use your location and historical data — all processed securely.
        </div>
      </Section>

      {/* Recycle Bin */}
      <TrashSection trashedPins={trashedPins} trashedTeams={trashedTeams} restorePin={restorePin} restoreTeam={restoreTeam} t={t} />

      {/* Support */}
      <Section title={t.support}>
        <SettingRow label={t.tutorial} onPress={() => {}} />
        <SettingRow label={t.contactSupport} onPress={() => window.open('mailto:support@knockai.com')} />
        <SettingRow label={t.privacy} onPress={() => setShowPrivacy(true)} />
        <SettingRow label={t.terms} onPress={() => setShowTerms(true)} />
      </Section>

      <HydrotechCard label={t.partnerWith} />

      {/* Logout */}
      <div style={{ padding: '16px 16px 0' }}>
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
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} user={user} updateUser={updateUser} onChangePassword={() => { setShowAccountModal(false); setShowPasswordModal(true); }} t={t} />}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} t={t} />}
      {showTeamModal && <TeamJoinCreateModal onClose={() => setShowTeamModal(false)} t={t} team={team} createTeam={createTeam} joinTeam={joinTeam} />}
      {showExportModal && <ExportStatsModal onClose={() => setShowExportModal(false)} sessions={sessions} />}
      {showPinExportModal && <ExportPinsModal onClose={() => setShowPinExportModal(false)} pins={pins} />}
      {showPrivacy && <TextModal onClose={() => setShowPrivacy(false)} title={t.privacy} body={PRIVACY_TEXT} />}
      {showTerms && <TextModal onClose={() => setShowTerms(false)} title={t.terms} body={TERMS_TEXT} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROFILE CARD
══════════════════════════════════════════════════════════════ */

function ProfileCard({ user, t, onAccountPress }: { user: any; t: Record<string, string>; onAccountPress: () => void }) {
  const roleLabel: Record<UserRole, string> = { member: t.member, manager: t.manager, owner: t.owner };
  return (
    <div data-tour="settings-profile" style={{ margin: '0 16px 16px', borderRadius: 16, background: 'linear-gradient(135deg, #1A3A6B, #0D2B55)', border: '1px solid rgba(26,111,214,0.3)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, overflow: 'hidden' }}>
          {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          <div style={{ marginTop: 6, display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: roleColor(user?.role || 'member'), fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {roleLabel[user?.role as UserRole || 'member']}
          </div>
        </div>
      </div>
      <button
        onClick={onAccountPress}
        style={{ width: '100%', padding: '13px 20px', background: 'rgba(26,111,214,0.15)', border: 'none', borderTop: '1px solid rgba(26,111,214,0.2)', color: '#60A5FA', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <span>👤</span> {t.myAccount} <span style={{ fontSize: 16, color: '#4B5563' }}>›</span>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TEAM CARD (expandable)
══════════════════════════════════════════════════════════════ */

function TeamCard({ user, team, teamMembers, updateTeam, leaveTeam, deleteTeam, createTeam, joinTeam, teamSettings, setTeamSettings, t }: any) {
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(team?.name || '');
  const [copied, setCopied] = useState(false);
  const [leaveFlow, setLeaveFlow] = useState<null | 'confirm' | 'transfer' | 'delete'>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const { updateMemberRole } = useKnockAIStore();

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager' || isOwner;

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) updateTeam({ logoUrl: ev.target.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [updateTeam]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(team.inviteCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!team) {
    return (
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{t.teamSection}</div>
        <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', color: '#6B7280', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{t.noTeam}</div>
          <SettingRow label={t.createTeam} onPress={() => { /* handled inline below */ }} />
          <TeamJoinCreateInline t={t} createTeam={createTeam} joinTeam={joinTeam} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{t.teamSection}</div>
      <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>

        {/* Team header row — click to expand */}
        <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {team.logoUrl ? <img src={team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{teamMembers.length} membre{teamMembers.length !== 1 ? 's' : ''}</div>
          </div>
          <span style={{ color: '#4B5563', fontSize: 20, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
        </button>

        {open && (
          <div>
            {/* Team name */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t.teamName}</div>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none' }} autoFocus />
                  <button onClick={() => { updateTeam({ name: nameInput.trim() || team.name }); setEditingName(false); }} style={smallBtn('#1A6FD6')}>{t.save}</button>
                  <button onClick={() => { setEditingName(false); setNameInput(team.name); }} style={smallBtn('rgba(255,255,255,0.1)')}>{t.cancel}</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{team.name}</span>
                  {isManager && <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 14, padding: '4px 8px' }}>✏️ {t.editName}</button>}
                </div>
              )}
            </div>

            {/* Team logo */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {team.logoUrl ? <img src={team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#E5E7EB', fontWeight: 600 }}>Logo de l&apos;équipe</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>JPG, PNG • visible par tous</div>
              </div>
              {isOwner && (
                <>
                  <button onClick={() => logoRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(26,111,214,0.1)', color: '#1A6FD6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Modifier
                  </button>
                  <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                </>
              )}
            </div>

            {/* Invite code */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{t.inviteCode}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: '#1A6FD6', letterSpacing: 4, flex: 1 }}>{team.inviteCode}</div>
                <button onClick={handleCopy} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(26,111,214,0.4)'}`, background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(26,111,214,0.1)', color: copied ? '#10B981' : '#1A6FD6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
            </div>

            {/* Team toggles */}
            <div style={{ padding: '10px 16px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Paramètres d&apos;équipe</div>
            </div>
            <ToggleRow label={`📍 ${t.shareLocation}`} value={teamSettings.shareLocation} onChange={(v) => setTeamSettings({ shareLocation: v })} />
            <ToggleRow label={`👣 ${t.showMemberTrails}`} value={teamSettings.showMemberTrails} onChange={(v) => setTeamSettings({ showMemberTrails: v })} />
            <ToggleRow label={`🎉 ${t.salesNotif}`} value={teamSettings.salesNotif} onChange={(v) => setTeamSettings({ salesNotif: v })} />
            <ToggleRow label={`🎯 ${t.dailyGoalSync}`} value={teamSettings.dailyGoalSync} onChange={(v) => setTeamSettings({ dailyGoalSync: v })} />

            {/* Leave / Delete actions */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!isOwner && (
                <button onClick={() => setLeaveFlow('confirm')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  🚪 {t.leaveTeam}
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => setLeaveFlow('transfer')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    👑 {t.transferOwner}
                  </button>
                  <button onClick={() => setLeaveFlow('delete')} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    🗑 {t.deleteTeam}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leave confirm modal */}
      {leaveFlow === 'confirm' && (
        <CenteredModal onClose={() => setLeaveFlow(null)} title={t.leaveTeam}>
          <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>Vos pins et sessions seront conservés. Vous pouvez rejoindre avec un code d&apos;invitation.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setLeaveFlow(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={() => { leaveTeam(); setLeaveFlow(null); setOpen(false); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.leaveTeam}</button>
          </div>
        </CenteredModal>
      )}

      {/* Transfer ownership modal */}
      {leaveFlow === 'transfer' && (
        <CenteredModal onClose={() => setLeaveFlow(null)} title={t.transferOwner}>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 14 }}>Choisissez un membre à qui transférer la propriété :</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {teamMembers.filter((m: any) => m.id !== user?.id).map((m: any) => (
              <button key={m.id} onClick={() => setTransferTarget(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `2px solid ${transferTarget === m.id ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`, background: transferTarget === m.id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1A3A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.profilePhotoUrl ? <img src={m.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.fullName}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{m.email}</div>
                </div>
                {transferTarget === m.id && <span style={{ color: '#F59E0B', fontSize: 16 }}>✓</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLeaveFlow(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button
              disabled={!transferTarget}
              onClick={() => { if (transferTarget) { updateMemberRole(transferTarget, 'owner'); leaveTeam(); setLeaveFlow(null); setOpen(false); } }}
              style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: transferTarget ? '#F59E0B' : '#374151', color: '#fff', fontWeight: 700, cursor: transferTarget ? 'pointer' : 'default' }}
            >
              Transférer &amp; Quitter
            </button>
          </div>
        </CenteredModal>
      )}

      {/* Delete team modal */}
      {leaveFlow === 'delete' && (
        <CenteredModal onClose={() => setLeaveFlow(null)} title={t.deleteTeam}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: '#9CA3AF', fontSize: 14, lineHeight: 1.6 }}>L&apos;équipe sera déplacée dans la corbeille. Vous avez <strong style={{ color: '#F59E0B' }}>30 jours</strong> pour la restaurer.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLeaveFlow(null)} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={() => { deleteTeam(); setLeaveFlow(null); setOpen(false); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.deleteTeam}</button>
          </div>
        </CenteredModal>
      )}
    </div>
  );
}

function TeamJoinCreateInline({ t, createTeam, joinTeam }: any) {
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (mode === 'none') {
    return (
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => setMode('create')} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t.createTeam}</button>
        <button onClick={() => setMode('join')} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#E5E7EB', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t.joinTeam}</button>
      </div>
    );
  }
  return (
    <div style={{ padding: '12px 16px' }}>
      <input value={input} onChange={(e) => { setInput(e.target.value); setError(''); }} placeholder={mode === 'create' ? 'Nom de l\'équipe…' : 'Code d\'invitation…'} style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
      {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setMode('none'); setInput(''); setError(''); }} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>{t.cancel}</button>
        <button disabled={loading} onClick={async () => {
          if (!input.trim()) return;
          setLoading(true);
          if (mode === 'create') { await createTeam(input.trim()); }
          else { const r = await joinTeam(input.trim().toUpperCase()); if (!r.ok) { setError(r.error || 'Code invalide'); setLoading(false); return; } }
          setLoading(false); setMode('none'); setInput('');
        }} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          {loading ? '...' : mode === 'create' ? t.createTeam : t.joinTeam}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACCOUNT MODAL
══════════════════════════════════════════════════════════════ */

function AccountModal({ onClose, user, updateUser, onChangePassword, t }: any) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.fullName || '');
  const [nameError, setNameError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) updateUser({ profilePhotoUrl: ev.target.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <CenteredModal onClose={onClose} title={t.myAccount}>
      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #1A6FD6, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden', cursor: 'pointer' }} onClick={() => photoRef.current?.click()}>
            {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
          </div>
          <button onClick={() => photoRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#1A6FD6', border: '2px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}>📷</button>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        </div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Appuyer pour changer la photo</div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Nom complet</label>
        {editingName ? (
          <div>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(26,111,214,0.5)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} autoFocus />
            {nameError && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 6 }}>{nameError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveName} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{t.save}</button>
              <button onClick={() => { setEditingName(false); setNameError(''); setNameInput(user?.fullName || ''); }} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>{user?.fullName}</span>
            <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 13 }}>✏️ {t.editName}</button>
          </div>
        )}
      </div>

      {/* Email */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Courriel</label>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 15, color: '#6B7280' }}>
          {user?.email}
        </div>
      </div>

      {/* Actions */}
      <button onClick={onChangePassword} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(26,111,214,0.3)', background: 'rgba(26,111,214,0.08)', color: '#60A5FA', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
        🔒 {t.changePassword}
      </button>
      <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#9CA3AF', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
        {t.cancel}
      </button>
    </CenteredModal>
  );
}

/* ══════════════════════════════════════════════════════════════
   TRASH SECTION
══════════════════════════════════════════════════════════════ */

const PIN_TYPE_LABELS: Record<string, string> = {
  sale: 'Vente', not_interested: 'Non intéressé', call_back: 'Rappel', ai_knocked: 'IA Knocké',
};
const PIN_TYPE_COLORS: Record<string, string> = {
  sale: '#34D399', not_interested: '#EF4444', call_back: '#F59E0B', ai_knocked: '#3B82F6',
};

function TrashSection({ trashedPins, trashedTeams, restorePin, restoreTeam, t }: { trashedPins: TrashedPin[]; trashedTeams: TrashedTeam[]; restorePin: (id: string) => void; restoreTeam: (id: string) => void; t: Record<string, string> }) {
  const [tab, setTab] = useState<'teams' | 'pins'>('teams');
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;

  const activePins = trashedPins.filter((p) => now - new Date(p.deletedAt).getTime() < THIRTY_DAYS);
  const activeTeams = trashedTeams.filter((e) => now - new Date(e.deletedAt).getTime() < THIRTY_DAYS);
  const isEmpty = activePins.length === 0 && activeTeams.length === 0;

  const daysLeft = (deletedAt: string) => Math.max(0, 30 - Math.floor((now - new Date(deletedAt).getTime()) / 86400000));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-CA');

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        🗑 {t.trash}
        {!isEmpty && <span style={{ background: '#374151', color: '#9CA3AF', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>{activePins.length + activeTeams.length}</span>}
      </div>
      <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {(['teams', 'pins'] as const).map((tabId) => (
            <button key={tabId} onClick={() => setTab(tabId)} style={{ flex: 1, padding: '11px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === tabId ? '#EF4444' : 'transparent'}`, color: tab === tabId ? '#EF4444' : '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {tabId === 'teams' ? `${t.trashTeams} (${activeTeams.length})` : `${t.trashPins} (${activePins.length})`}
            </button>
          ))}
        </div>

        {isEmpty && tab === 'teams' && activeTeams.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#4B5563', fontSize: 13 }}>{t.emptyTrash}</div>
        )}
        {isEmpty && tab === 'pins' && activePins.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#4B5563', fontSize: 13 }}>{t.emptyTrash}</div>
        )}

        {/* Teams list */}
        {tab === 'teams' && activeTeams.map((entry) => (
          <div key={entry.team.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {entry.team.logoUrl ? <img src={entry.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.team.name}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{t.deletedOn} {formatDate(entry.deletedAt)}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: daysLeft(entry.deletedAt) <= 5 ? '#EF4444' : '#F59E0B' }}>{daysLeft(entry.deletedAt)}j</div>
              <div style={{ fontSize: 10, color: '#6B7280' }}>{t.daysLeft}</div>
            </div>
            <button onClick={() => restoreTeam(entry.team.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              {t.restore}
            </button>
          </div>
        ))}

        {/* Pins list */}
        {tab === 'pins' && activePins.map((pin) => {
          const color = PIN_TYPE_COLORS[pin.type] || '#6B7280';
          return (
            <div key={pin.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color, flexShrink: 0 }}>
                {pin.type === 'sale' ? '✓' : pin.type === 'not_interested' ? '✕' : pin.type === 'call_back' ? '?' : '🤖'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 2 }}>{PIN_TYPE_LABELS[pin.type] || pin.type}</div>
                <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.address || `${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`}</div>
                <div style={{ fontSize: 10, color: '#4B5563', marginTop: 2 }}>{t.deletedOn} {formatDate(pin.deletedAt)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: daysLeft(pin.deletedAt) <= 5 ? '#EF4444' : '#F59E0B' }}>{daysLeft(pin.deletedAt)}j</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>{t.daysLeft}</div>
              </div>
              <button onClick={() => restorePin(pin.id)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {t.restore}
              </button>
            </div>
          );
        })}

        <div style={{ padding: '8px 16px', fontSize: 11, color: '#374151', textAlign: 'center' }}>
          Les éléments supprimés sont conservés pendant 30 jours.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════ */

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
    <button onClick={onPress} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: onPress ? 'pointer' : 'default', textAlign: 'left' }}>
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
      <div style={{ width: '100%', maxWidth: 400, background: '#1E293B', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
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
      ...filtered.map((s) => [s.date, new Date(s.clockInAt).toLocaleTimeString(), s.clockOutAt ? new Date(s.clockOutAt).toLocaleTimeString() : '', Math.round((s.durationSeconds || 0) / 60), s.doorsKnocked, s.salesMade, Math.round(s.distanceMeters)]),
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

const PIN_FILTER_OPTIONS: { value: PinType | 'all'; label: string; emoji: string; color: string }[] = [
  { value: 'all', label: 'Tous les pins', emoji: '📍', color: '#6B7280' },
  { value: 'sale', label: 'Ventes', emoji: '✓', color: '#34D399' },
  { value: 'not_interested', label: 'Non intéressés', emoji: '✕', color: '#EF4444' },
  { value: 'call_back', label: 'Rappels', emoji: '?', color: '#F59E0B' },
  { value: 'ai_knocked', label: 'IA Knocké', emoji: '🤖', color: '#3B82F6' },
];

function ExportPinsModal({ onClose, pins }: { onClose: () => void; pins: any[] }) {
  const [filter, setFilter] = useState<PinType | 'all'>('all');
  const filteredPins = filter === 'all' ? pins : pins.filter((p) => p.type === filter);
  const count = filteredPins.length;

  const handleExport = () => {
    const rows = [
      ['Date', 'Heure', 'Type', 'Adresse', 'Latitude', 'Longitude', 'Nom du lead', 'Notes'],
      ...filteredPins.map((p) => {
        const d = new Date(p.placedAt);
        return [d.toLocaleDateString('fr-CA'), d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }), PIN_TYPE_LABELS[p.type] || p.type, p.address, p.lat, p.lng, p.leadName || '', p.notes || ''];
      }),
    ];
    const label = filter === 'all' ? 'Tous' : PIN_TYPE_LABELS[filter] || filter;
    downloadExcel(rows, `Pins - ${label}`, `knockai-pins-${filter}.xlsx`);
    onClose();
  };

  return (
    <CenteredModal onClose={onClose} title="Exporter les pins">
      <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>Choisissez quels pins exporter :</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {PIN_FILTER_OPTIONS.map((opt) => {
          const selected = filter === opt.value;
          return (
            <button key={opt.value} onClick={() => setFilter(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${selected ? opt.color : 'rgba(255,255,255,0.08)'}`, background: selected ? `${opt.color}18` : 'rgba(255,255,255,0.03)', transition: 'all 0.15s' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff' }}>{opt.emoji}</div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: selected ? '#fff' : '#D1D5DB', textAlign: 'left' }}>{opt.label}</span>
              {selected && <span style={{ fontSize: 16, color: opt.color }}>✓</span>}
            </button>
          );
        })}
      </div>
      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', marginBottom: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
        {count === 0 ? 'Aucun pin à exporter' : `${count} pin${count > 1 ? 's' : ''} sera${count > 1 ? 'ont' : ''} exporté${count > 1 ? 's' : ''}`}
      </div>
      <button onClick={handleExport} disabled={count === 0} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: count === 0 ? '#374151' : 'linear-gradient(135deg, #1A6FD6, #3B82F6)', color: '#fff', fontWeight: 700, cursor: count === 0 ? 'default' : 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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

/* ── Helpers ── */
/* ══════════════════════════════════════════════════════════════
   DAILY STATS SECTION
══════════════════════════════════════════════════════════════ */

const MONTH_NAMES: Record<string, string[]> = {
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

const DAY_NAMES: Record<string, string[]> = {
  fr: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  es: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
};

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatWorkTime(secs: number, lang: string): string {
  if (secs === 0) return '--';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return lang === 'fr' ? `${m}min` : `${m}m`;
  return lang === 'fr' ? `${h}h ${m}min` : `${h}h ${m}m`;
}

function DailyStatsSection({ lang }: { lang: string }) {
  const { pins, sessions, user } = useKnockAIStore();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const today = new Date();
  const isToday = toLocalDateKey(selectedDate) === toLocalDateKey(today);
  const isCurrentMonth = selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();

  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const days = DAY_NAMES[lang] || DAY_NAMES.en;

  const dateKey = toLocalDateKey(selectedDate);
  const dayPins = pins.filter((p) => p.userId === user?.id && toLocalDateKey(new Date(p.placedAt)) === dateKey);
  const dayDoors = dayPins.length;
  const daySales = dayPins.filter((p) => p.type === 'sale').length;
  const dayRatio = dayDoors > 0 ? Math.round((daySales / dayDoors) * 100) : 0;
  const daySessions = sessions.filter((s) => s.userId === user?.id && s.date === dateKey && s.clockOutAt);
  const daySeconds = daySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const hasData = dayDoors > 0 || daySeconds > 0;

  const prevMonth = () => setSelectedDate((d) => {
    const n = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    n.setDate(Math.min(d.getDate(), lastDay));
    return n;
  });

  const nextMonth = () => setSelectedDate((d) => {
    if (isCurrentMonth) return d;
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const lastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    n.setDate(Math.min(d.getDate(), lastDay));
    if (n > today) return new Date(today);
    return n;
  });

  const prevDay = () => setSelectedDate((d) => {
    const n = new Date(d);
    n.setDate(n.getDate() - 1);
    return n;
  });

  const nextDay = () => setSelectedDate((d) => {
    if (isToday) return d;
    const n = new Date(d);
    n.setDate(n.getDate() + 1);
    if (n > today) return new Date(today);
    return n;
  });

  const statsLabel = lang === 'fr' ? 'Stats' : 'Stats';
  const todayLabel = lang === 'fr' ? "Aujourd'hui" : lang === 'es' ? 'Hoy' : 'Today';
  const noDataLabel = lang === 'fr' ? 'Aucune activité ce jour' : lang === 'es' ? 'Sin actividad' : 'No activity this day';
  const dayLabel = isToday ? todayLabel : `${days[selectedDate.getDay()]} ${selectedDate.getDate()}`;

  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{statsLabel}</div>
      <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📊</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{statsLabel}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{dayLabel} · {months[selectedDate.getMonth()]}</div>
          </div>
          <span style={{ color: '#4B5563', fontSize: 20, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>›</span>
        </button>

        {open && (
          <div style={{ padding: '16px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button onClick={prevMonth} style={statsNavBtn}>◀</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>{months[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
              <button onClick={nextMonth} disabled={isCurrentMonth} style={{ ...statsNavBtn, opacity: isCurrentMonth ? 0.3 : 1, cursor: isCurrentMonth ? 'default' : 'pointer' }}>▶</button>
            </div>

            {/* Day nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px' }}>
              <button onClick={prevDay} style={statsNavBtn}>◀</button>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{dayLabel}</span>
              <button onClick={nextDay} disabled={isToday} style={{ ...statsNavBtn, opacity: isToday ? 0.3 : 1, cursor: isToday ? 'default' : 'pointer' }}>▶</button>
            </div>

            {/* Stats */}
            {!hasData ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#4B5563', fontSize: 13 }}>{noDataLabel}</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DayStat value={String(dayDoors)} label={lang === 'fr' ? 'Portes' : lang === 'es' ? 'Puertas' : 'Doors'} color="#8B5CF6" icon="🚪" />
                <DayStat value={String(daySales)} label={lang === 'fr' ? 'Ventes' : lang === 'es' ? 'Ventas' : 'Sales'} color="#10B981" icon="💰" />
                <DayStat value={`${dayRatio}%`} label="Ratio" color="#F59E0B" icon="🎯" />
                <DayStat value={formatWorkTime(daySeconds, lang)} label={lang === 'fr' ? 'Temps' : lang === 'es' ? 'Tiempo' : 'Time'} color="#1A6FD6" icon="⏱" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const statsNavBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: '#fff', fontSize: 13, padding: '6px 11px', cursor: 'pointer', lineHeight: 1,
};

function DayStat({ value, label, color, icon }: { value: string; label: string; color: string; icon: string }) {
  return (
    <div style={{ padding: '14px 10px', borderRadius: 12, background: `${color}15`, border: `1px solid ${color}33`, textAlign: 'center' }}>
      <div style={{ fontSize: 13, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function roleColor(role: UserRole) {
  if (role === 'owner') return '#7C3AED';
  if (role === 'manager') return '#1A6FD6';
  return '#374151';
}

function smallBtn(bg: string): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };
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
