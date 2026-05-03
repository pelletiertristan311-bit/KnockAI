'use client';
import { useState, useRef } from 'react';
import { useKnockAIStore, UserRole, TeamMember, Route, TeamDate } from '@/lib/knockai/store';

const ROLE_COLORS: Record<UserRole, string> = { owner: '#7C3AED', manager: '#1A6FD6', member: '#374151' };
const ROLE_LABELS: Record<string, Record<UserRole, string>> = {
  en: { owner: 'Owner', manager: 'Manager', member: 'Member' },
  fr: { owner: 'Propriétaire', manager: 'Gérant', member: 'Membre' },
  es: { owner: 'Dueño', manager: 'Gerente', member: 'Miembro' },
};

const T: Record<string, Record<string, string>> = {
  en: { team: 'Team', noTeam: "You're not on a team yet", joinPrompt: 'Join or create a team to collaborate with your colleagues.', joinTeam: 'Join a Team', createTeam: 'Create a Team', members: 'Members', dates: 'Dates', routes: 'Routes', leaderboard: 'Leaderboard', today: 'Today', allTime: 'All Time', doors: 'Doors', sales: 'Sales', online: 'Online', offline: 'Offline', noRoutes: 'No team routes yet.', share: 'Share Code', inviteCode: 'Invite Code', editTeamName: 'Edit Team Name', save: 'Save', cancel: 'Cancel', role: 'Role', promote: 'Promote', demote: 'Demote', remove: 'Remove', topSeller: 'Top Seller', members2: 'Members', noSales: 'No sales yet', availableDates: 'Available dates', addDate: 'Add date', addDateTitle: 'Add a date', noDates: 'No dates yet. Add one to get started!', city: 'City', date: 'Date', time: 'Time', notes: 'Notes', notesPlaceholder: 'Notes (optional, e.g. Morning only)', add: 'Add', book: 'Book', bookedBy: 'Booked by', available: 'Available', deleteQ: 'Delete?' },
  fr: { team: 'Équipe', noTeam: "Vous n'êtes pas encore dans une équipe", joinPrompt: 'Rejoignez ou créez une équipe pour collaborer.', joinTeam: 'Rejoindre', createTeam: 'Créer une équipe', members: 'Membres', dates: 'Dates', routes: 'Routes', leaderboard: 'Classement', today: "Aujourd'hui", allTime: 'Total', doors: 'Portes', sales: 'Ventes', online: 'En ligne', offline: 'Hors ligne', noRoutes: 'Aucune route.', share: 'Partager', inviteCode: "Code d'invitation", editTeamName: 'Modifier le nom', save: 'Sauvegarder', cancel: 'Annuler', role: 'Rôle', promote: 'Promouvoir', demote: 'Rétrograder', remove: 'Retirer', topSeller: 'Top vendeur', members2: 'Membres', noSales: 'Aucune vente', availableDates: 'Dates disponibles', addDate: 'Ajouter une date', addDateTitle: 'Ajouter une date', noDates: 'Aucune date. Ajoutez-en une!', city: 'Ville', date: 'Date', time: 'Heure', notes: 'Notes', notesPlaceholder: 'Notes (optionnel, ex: Matin seulement)', add: 'Ajouter', book: 'Réserver', bookedBy: 'Réservé par', available: 'Disponible', deleteQ: 'Supprimer?' },
  es: { team: 'Equipo', noTeam: 'Aún no estás en un equipo', joinPrompt: 'Únete o crea un equipo para colaborar.', joinTeam: 'Unirse', createTeam: 'Crear equipo', members: 'Miembros', dates: 'Fechas', routes: 'Rutas', leaderboard: 'Ranking', today: 'Hoy', allTime: 'Total', doors: 'Puertas', sales: 'Ventas', online: 'En línea', offline: 'Desconectado', noRoutes: 'Sin rutas.', share: 'Compartir', inviteCode: 'Código', editTeamName: 'Editar nombre', save: 'Guardar', cancel: 'Cancelar', role: 'Rol', promote: 'Promover', demote: 'Degradar', remove: 'Eliminar', topSeller: 'Top vendedor', members2: 'Miembros', noSales: 'Sin ventas', availableDates: 'Fechas disponibles', addDate: 'Agregar fecha', addDateTitle: 'Agregar fecha', noDates: 'Sin fechas aún.', city: 'Ciudad', date: 'Fecha', time: 'Hora', notes: 'Notas', notesPlaceholder: 'Notas (opcional)', add: 'Agregar', book: 'Reservar', bookedBy: 'Reservado por', available: 'Disponible', deleteQ: '¿Eliminar?' },
};

export default function TeamScreen() {
  const {
    user, team, teamMembers, teamDates, routes, teamTab, pins, teamSettings,
    setTeamTab, addTeamDate, claimTeamDate, unclaimTeamDate, deleteTeamDate,
    updateTeam, updateMemberRole, deleteRoute,
    createTeam, joinTeam,
  } = useKnockAIStore();

  const lang = user?.language || 'fr';
  const t = T[lang] || T.fr;
  const rl = ROLE_LABELS[lang] || ROLE_LABELS.fr;

  if (!team) return <NoTeam t={t} createTeam={createTeam} joinTeam={joinTeam} />;

  const isManager = user?.role === 'manager' || user?.role === 'owner';

  const today = new Date().toDateString();
  const [statsMode, setStatsMode] = useState<'today' | 'all'>('today');
  const teamPins = pins.filter((p) => p.teamId === team.id);
  const todayTeamPins = teamPins.filter((p) => new Date(p.placedAt).toDateString() === today);
  const targetPins = statsMode === 'today' ? todayTeamPins : teamPins;
  const doorsCount = targetPins.length;
  const salesCount = targetPins.filter((p) => p.type === 'sale').length;
  const onlineCount = teamMembers.filter((m) => m.isOnline).length;

  const topMember = teamMembers.reduce<TeamMember | null>((best, m) => {
    const mSales = statsMode === 'today' ? (m.salesToday || 0) : teamPins.filter((p) => p.userId === m.id && p.type === 'sale').length;
    const bestSales = best ? (statsMode === 'today' ? (best.salesToday || 0) : teamPins.filter((p) => p.userId === best.id && p.type === 'sale').length) : -1;
    return mSales > bestSales ? m : best;
  }, null);

  const teamRoutes = routes.filter((r) => r.teamId === team.id || r.type === 'team');

  const tabs = [
    { id: 'members' as const, label: t.members },
    { id: 'dates' as const, label: t.dates },
    { id: 'routes' as const, label: t.routes },
    { id: 'leaderboard' as const, label: t.leaderboard },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0F172A' }}>
      <TeamHeader team={team} isManager={isManager} updateTeam={updateTeam} t={t} lang={lang} rl={rl} user={user} />

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: 12 }}>
          {(['today', 'all'] as const).map((mode) => (
            <button key={mode} onClick={() => setStatsMode(mode)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: statsMode === mode ? '#1A6FD6' : 'transparent', color: statsMode === mode ? '#fff' : '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
              {mode === 'today' ? t.today : t.allTime}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <StatCard value={doorsCount} label={t.doors} color="#8B5CF6" />
          <StatCard value={salesCount} label={t.sales} color="#10B981" />
          <StatCard value={onlineCount} label={t.online} color="#1A6FD6" />
          <StatCard value={topMember ? (topMember.fullName.split(' ')[0]) : '-'} label={t.topSeller} color="#F59E0B" small />
        </div>
      </div>

      <div style={{ display: 'flex', padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTeamTab(id)} data-tour={`team-tab-${id}`} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', borderBottom: `2px solid ${teamTab === id ? '#1A6FD6' : 'transparent'}`, color: teamTab === id ? '#1A6FD6' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {teamTab === 'members' && <MembersTab members={teamMembers} user={user} isManager={isManager} updateMemberRole={updateMemberRole} t={t} rl={rl} />}
        {teamTab === 'dates' && <DatesTab dates={teamDates} user={user} isManager={isManager} addTeamDate={addTeamDate} claimTeamDate={claimTeamDate} unclaimTeamDate={unclaimTeamDate} deleteTeamDate={deleteTeamDate} team={team} teamSettings={teamSettings} t={t} />}
        {teamTab === 'routes' && <RoutesTab routes={teamRoutes} isManager={isManager} deleteRoute={deleteRoute} t={t} />}
        {teamTab === 'leaderboard' && <LeaderboardTab members={teamMembers} pins={teamPins} todayPins={todayTeamPins} statsMode={statsMode} t={t} />}
      </div>
    </div>
  );
}

/* ─── Team Header ─── */
function TeamHeader({ team, isManager, updateTeam, t, lang, rl, user }: any) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(team.name);
  const [copied, setCopied] = useState(false);
  const [logoHover, setLogoHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = user?.role === 'owner';

  const handleShare = () => {
    navigator.clipboard?.writeText(team.inviteCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { updateTeam({ logoUrl: reader.result as string }); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding: '20px 16px 0', background: 'linear-gradient(180deg, #0D2B55 0%, #0F172A 100%)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div
          style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, cursor: isOwner ? 'pointer' : 'default' }}
          onMouseEnter={() => isOwner && setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          onClick={() => isOwner && fileInputRef.current?.click()}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, overflow: 'hidden' }}>
            {team.logoUrl ? <img src={team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} /> : '🏆'}
          </div>
          {isOwner && logoHover && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📷</div>
          )}
          {isOwner && (
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,111,214,0.5)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, outline: 'none' }} autoFocus />
              <button onClick={() => { updateTeam({ name: nameInput.trim() || team.name }); setEditing(false); }} style={chip('#1A6FD6')}>{t.save}</button>
              <button onClick={() => { setEditing(false); setNameInput(team.name); }} style={chip('rgba(255,255,255,0.1)')}>{t.cancel}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{team.name}</span>
              {isManager && <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 14 }}>✏️</button>}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{t.inviteCode}:</span>
            <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#1A6FD6', letterSpacing: 2 }}>{team.inviteCode}</span>
            <button onClick={handleShare} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(26,111,214,0.4)', background: 'rgba(26,111,214,0.1)', color: copied ? '#10B981' : '#1A6FD6', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {copied ? '✓ Copied' : t.share}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Member Avatar ─── */
function MemberAvatar({ member, size = 40 }: { member: TeamMember; size?: number }) {
  const initials = member.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#1A6FD6', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6'];
  const color = colors[member.fullName.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: member.profilePhotoUrl ? 'transparent' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 800, color: '#fff' }}>
      {member.profilePhotoUrl
        ? <img src={member.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ value, label, color, small }: { value: number | string; label: string; color: string; small?: boolean }) {
  return (
    <div style={{ padding: '10px 8px', borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, textAlign: 'center' }}>
      <div style={{ fontSize: small ? 13 : 20, fontWeight: 800, color, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─── Members Tab ─── */
function MembersTab({ members, user, isManager, updateMemberRole, t, rl }: any) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {members.map((m: TeamMember) => (
        <div key={m.id} onClick={() => isManager && m.id !== user?.id ? setSelectedMember(m) : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: isManager && m.id !== user?.id ? 'pointer' : 'default' }}>
          <MemberAvatar member={m} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              {m.fullName}
              {m.id === user?.id && <span style={{ fontSize: 10, color: '#6B7280' }}>(you)</span>}
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{m.email}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ padding: '2px 8px', borderRadius: 10, background: ROLE_COLORS[m.role], fontSize: 10, fontWeight: 700, color: '#fff' }}>{rl[m.role]}</div>
            <div style={{ fontSize: 11, color: m.isOnline ? '#10B981' : '#6B7280' }}>{m.isOnline ? t.online : t.offline}</div>
          </div>
        </div>
      ))}
      {selectedMember && (
        <RoleModal member={selectedMember} onClose={() => setSelectedMember(null)} updateMemberRole={updateMemberRole} t={t} rl={rl} currentUserRole={user?.role} />
      )}
    </div>
  );
}

function RoleModal({ member, onClose, updateMemberRole, t, rl, currentUserRole }: any) {
  const roles: UserRole[] = ['member', 'manager', 'owner'];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: '#1E293B', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 800 }}>{member.fullName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.role}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roles.map((r) => (
            <button key={r} onClick={() => { updateMemberRole(member.id, r); onClose(); }}
              style={{ padding: '12px 16px', borderRadius: 12, border: `2px solid ${member.role === r ? ROLE_COLORS[r] : 'rgba(255,255,255,0.08)'}`, background: member.role === r ? `${ROLE_COLORS[r]}22` : 'transparent', color: member.role === r ? ROLE_COLORS[r] : '#9CA3AF', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {rl[r]}
              {member.role === r && <span style={{ fontSize: 16 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Dates Tab ─── */
function DatesTab({ dates, user, isManager, addTeamDate, claimTeamDate, unclaimTeamDate, deleteTeamDate, team, teamSettings, t }: any) {
  const [showAddModal, setShowAddModal] = useState(false);

  const sorted = [...(dates || [])].sort((a: TeamDate, b: TeamDate) => {
    return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 16px 10px' }}>
        <span style={{ color: '#E5E7EB', fontWeight: 700, fontSize: 15 }}>{t.availableDates}</span>
        {isManager && (
          <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + {t.addDate}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', color: '#4B5563', fontSize: 14, textAlign: 'center', gap: 10 }}>
            <span style={{ fontSize: 40 }}>📅</span>
            <span>{t.noDates}</span>
          </div>
        ) : (
          sorted.map((d: TeamDate) => (
            <DateCard key={d.id} date={d} user={user} isManager={isManager} claimTeamDate={claimTeamDate} unclaimTeamDate={unclaimTeamDate} deleteTeamDate={deleteTeamDate} t={t} />
          ))
        )}
      </div>

      {showAddModal && (
        <AddDateModal onClose={() => setShowAddModal(false)} addTeamDate={addTeamDate} team={team} user={user} teamSettings={teamSettings} t={t} />
      )}
    </div>
  );
}

function DateCard({ date, user, isManager, claimTeamDate, unclaimTeamDate, deleteTeamDate, t }: { date: TeamDate; user: any; isManager: boolean; claimTeamDate: any; unclaimTeamDate: any; deleteTeamDate: any; t: any }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isClaimed = !!date.claimedBy;
  const isMyClaim = date.claimedBy === user?.id;
  const canUnclaim = isMyClaim || isManager;

  const dateObj = new Date(`${date.date}T${date.time}`);
  const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const isPast = dateObj < new Date();

  return (
    <div style={{ padding: '14px', borderRadius: 14, background: isPast ? 'rgba(255,255,255,0.02)' : isClaimed ? 'rgba(16,185,129,0.06)' : 'rgba(26,111,214,0.06)', border: `1px solid ${isPast ? 'rgba(255,255,255,0.05)' : isClaimed ? 'rgba(16,185,129,0.25)' : 'rgba(26,111,214,0.2)'}`, opacity: isPast ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: isPast ? 'rgba(255,255,255,0.06)' : isClaimed ? 'rgba(16,185,129,0.15)' : 'rgba(26,111,214,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {isClaimed ? '✅' : isPast ? '⏰' : '📅'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{date.city}</div>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>{formattedDate} · {date.time}</div>
          {date.notes && <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>{date.notes}</div>}
          {isClaimed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ {t.bookedBy}: {date.claimedByName}</span>
            </div>
          )}
          {!isClaimed && !isPast && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: '#1A6FD6', fontWeight: 600 }}>◦ {t.available}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          {!isClaimed && !isPast && (
            <button onClick={() => claimTeamDate(date.id)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#1A6FD6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {t.book}
            </button>
          )}
          {canUnclaim && isClaimed && (
            <button onClick={() => unclaimTeamDate(date.id)} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {t.cancel}
            </button>
          )}
          {isManager && (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { deleteTeamDate(date.id); setConfirmDelete(false); }} style={{ padding: '5px 8px', borderRadius: 7, border: 'none', background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 8px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4B5563', fontSize: 15, padding: '2px 4px' }}>🗑</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function AddDateModal({ onClose, addTeamDate, team, user, teamSettings, t }: any) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const cities: string[] = teamSettings?.cities || [];
  const canSubmit = date && time && city.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    addTeamDate({
      date,
      time,
      city: city.trim(),
      notes: notes.trim() || undefined,
      createdBy: user?.id || '',
      createdByName: user?.fullName || '',
      teamId: team?.id || '',
    });
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' as any };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#9CA3AF', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 480, background: '#1E293B', borderRadius: '24px 24px 0 0', padding: '8px 20px 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '12px auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>{t.addDateTitle}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>{t.date} *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t.time} *</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t.city} *</label>
            {cities.length > 0 ? (
              <select value={city} onChange={(e) => setCity(e.target.value)}
                style={{ ...inputStyle, background: '#1E293B', color: city ? '#fff' : '#6B7280' }}>
                <option value="">-- {t.city} --</option>
                {cities.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t.city} style={inputStyle} />
            )}
          </div>

          <div>
            <label style={labelStyle}>{t.notes}</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} style={inputStyle} />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit}
          style={{ width: '100%', marginTop: 20, padding: '15px', borderRadius: 14, border: 'none', background: canSubmit ? 'linear-gradient(135deg, #1A6FD6, #7C3AED)' : 'rgba(255,255,255,0.07)', color: canSubmit ? '#fff' : '#4B5563', fontWeight: 800, fontSize: 16, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
          {t.add}
        </button>
      </div>
    </div>
  );
}

/* ─── Routes Tab ─── */
function RoutesTab({ routes, isManager, deleteRoute, t }: { routes: Route[]; isManager: boolean; deleteRoute: (id: string) => void; t: Record<string, string> }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (routes.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4B5563', fontSize: 14, textAlign: 'center', padding: 40 }}>
        {t.noRoutes}
      </div>
    );
  }

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {routes.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🗺️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{r.placedByName} · {new Date(r.createdAt).toLocaleDateString()}</div>
          </div>
          {isManager && (
            confirmId === r.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { deleteRoute(r.id); setConfirmId(null); }} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                <button onClick={() => setConfirmId(null)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(r.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>🗑</button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Leaderboard Tab ─── */
function LeaderboardTab({ members, pins, todayPins, statsMode, t }: any) {
  const targetPins = statsMode === 'today' ? todayPins : pins;

  const ranked = [...members].map((m: TeamMember) => ({
    ...m,
    sales: statsMode === 'today' ? (m.salesToday || 0) : targetPins.filter((p: any) => p.userId === m.id && p.type === 'sale').length,
    doors: statsMode === 'today' ? (m.doorsToday || 0) : targetPins.filter((p: any) => p.userId === m.id).length,
  })).sort((a, b) => b.sales - a.sales || b.doors - a.doors);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((m, i) => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: i === 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
          <div style={{ width: 30, textAlign: 'center', fontSize: i < 3 ? 22 : 14, fontWeight: 800, color: '#6B7280', flexShrink: 0 }}>
            {i < 3 ? medals[i] : `#${i + 1}`}
          </div>
          <MemberAvatar member={m} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.fullName}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{m.doors} {t.doors} · {m.sales} {t.sales}</div>
          </div>
          {m.sales > 0 && (
            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 13, fontWeight: 800 }}>
              {m.sales} 🎯
            </div>
          )}
        </div>
      ))}
      {ranked.every((m) => m.sales === 0) && (
        <div style={{ textAlign: 'center', color: '#4B5563', fontSize: 14, padding: '30px 20px' }}>{t.noSales}</div>
      )}
    </div>
  );
}

/* ─── No Team ─── */
function NoTeam({ t, createTeam, joinTeam }: { t: Record<string, string>; createTeam: (name: string) => Promise<void>; joinTeam: (code: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    await createTeam(input.trim());
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await joinTeam(input.trim().toUpperCase());
    setLoading(false);
    if (!res.ok) setError(res.error || 'Invalid code');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: '#0F172A' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🤝</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px', textAlign: 'center' }}>{t.noTeam}</h2>
      <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>{t.joinPrompt}</p>

      {mode === 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <button onClick={() => setMode('create')} style={{ padding: '16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #1A6FD6, #7C3AED)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>{t.createTeam}</button>
          <button onClick={() => setMode('join')} style={{ padding: '16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#E5E7EB', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>{t.joinTeam}</button>
        </div>
      )}

      {(mode === 'create' || mode === 'join') && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            placeholder={mode === 'create' ? 'Team name…' : 'Invite code…'}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
          />
          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setMode('none'); setInput(''); setError(''); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer' }}>{t.cancel}</button>
            <button onClick={mode === 'create' ? handleCreate : handleJoin} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: '#1A6FD6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? '...' : mode === 'create' ? t.createTeam : t.joinTeam}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Util ─── */
function chip(bg: string): React.CSSProperties {
  return { padding: '6px 12px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };
}
