import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/knockai/supabase';
import { randomId, randomInviteCode } from '@/lib/knockai/id';

async function syncToRedis(email: string, userData: object, teamId?: string, teamData?: object) {
  try {
    await fetch('/api/knockai/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userData, teamId, teamData }),
    });
  } catch { /* offline or Redis not configured */ }
}

async function syncTeamToRedis(teamId: string, teamMembers: object[], teamDates: object[], routes: object[], team?: object, pins?: object[], trailPoints?: object[], drawings?: object[], syncingUserId?: string) {
  try {
    await fetch('/api/knockai/team/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, teamMembers, teamDates, routes, team, pins, trailPoints, drawings, syncingUserId }),
    });
  } catch { /* offline */ }
}

function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function pollTeamFromRedis(teamId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/knockai/team/poll?teamId=${teamId}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.skipped || !json.data) return null;
    return json.data;
  } catch { return null; }
}

export type PinType = 'sale' | 'not_interested' | 'call_back' | 'ai_knocked';
export type UserRole = 'member' | 'manager' | 'owner';

export interface TrashedPin extends Pin { deletedAt: string; }
export interface TrashedTeam { team: Team; memberCount: number; deletedAt: string; }

export interface Pin {
  id: string;
  userId: string;
  placedByName: string;
  teamId?: string;
  lat: number;
  lng: number;
  address: string;
  type: PinType;
  leadName?: string;
  phone?: string;
  notes?: string;
  placedByAi: boolean;
  placedAt: string;
}

export interface Route {
  id: string;
  userId: string;
  placedByName: string;
  teamId?: string;
  name: string;
  type: 'individual' | 'team';
  lat: number;
  lng: number;
  polygon?: [number, number][];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  profilePhotoUrl?: string;
  isOnline: boolean;
  lat?: number;
  lng?: number;
  doorsToday?: number;
  salesToday?: number;
}

export interface LiveLocation {
  id: string;
  userId: string;
  teamId: string;
  lat: number;
  lng: number;
  heading?: number;
  isActive: boolean;
  clockedInAt: string;
  updatedAt: string;
}

export interface TeamDate {
  id: string;
  date: string;
  time: string;
  city: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  teamId: string;
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: string;
  dayGroupId?: string;
  cityLocked?: boolean;
}

export interface Session {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt?: string;
  durationSeconds?: number;
  distanceMeters: number;
  doorsKnocked: number;
  salesMade: number;
  date: string;
}

export interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
  userId: string;
}

export interface TeamDrawing {
  id: string;
  teamId: string;
  userId: string;
  userName?: string;
  coordinates: [number, number][];
  color: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  profilePhotoUrl?: string;
  teamId?: string;
  role: UserRole;
  language: string;
  distanceUnit: 'km' | 'miles';
  aiEnabled: boolean;
  nameChangesUsed: number;
  lastNameChangeAt?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  inviteCode: string;
  ownerId: string;
}

interface KnockAIState {
  user: User | null;
  isAuthenticated: boolean;
  authScreen: 'splash' | 'onboarding' | 'login' | 'signup' | 'forgot';
  activeTab: 'home' | 'team' | 'map' | 'settings';

  isClockedIn: boolean;
  isPaused: boolean;
  clockInTime: string | null;
  pausedAt: string | null;
  accumulatedSeconds: number;

  sessions: Session[];
  currentSession: Session | null;

  pins: Pin[];
  routes: Route[];
  team: Team | null;
  teamMembers: TeamMember[];
  teamDates: TeamDate[];
  teamTab: 'members' | 'dates' | 'routes' | 'leaderboard';

  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  userLocation: { lat: number; lng: number } | null;
  pinFilter: PinType | 'all';
  aiEnabled: boolean;

  addPinModal: { open: boolean; lat?: number; lng?: number };
  editPinModal: { open: boolean; pin?: Pin };
  statsModal: boolean;
  settingsSection: string | null;
  notifications: { push: boolean; chat: boolean; routes: boolean; aiAlerts: boolean };
  mapTheme: 'light' | 'dark';

  isOnline: boolean;
  dailyGoals: { doors: number; sales: number };
  trailPoints: TrailPoint[];
  trailView: 'mine' | 'team' | 'off';
  teamDrawings: TeamDrawing[];
  trashedPins: TrashedPin[];
  trashedTeams: TrashedTeam[];
  teamSettings: { shareLocation: boolean; showMemberTrails: boolean; salesNotif: boolean; dailyGoalSync: boolean; cities: string[] };
  liveLocations: LiveLocation[];

  setAuthScreen: (screen: KnockAIState['authScreen']) => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setActiveTab: (tab: KnockAIState['activeTab']) => void;
  clockIn: () => void;
  clockOut: () => void;
  pauseClock: () => void;
  resumeClock: () => void;
  addPin: (pin: Omit<Pin, 'id' | 'userId' | 'placedByName' | 'placedAt'>) => void;
  updatePin: (id: string, updates: Partial<Pin>) => void;
  deletePin: (id: string) => void;
  addRoute: (route: Omit<Route, 'id' | 'userId' | 'placedByName' | 'createdAt'>) => void;
  deleteRoute: (id: string) => void;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  setPinFilter: (filter: KnockAIState['pinFilter']) => void;
  toggleAI: () => void;
  openAddPinModal: (lat?: number, lng?: number) => void;
  closeAddPinModal: () => void;
  openEditPinModal: (pin: Pin) => void;
  closeEditPinModal: () => void;
  setStatsModal: (open: boolean) => void;
  setSettingsSection: (section: string | null) => void;
  addTeamDate: (date: Omit<TeamDate, 'id'>) => void;
  addTeamDay: (day: string, createdBy: string, createdByName: string, teamId: string) => void;
  claimTeamDate: (dateId: string, city?: string) => void;
  unclaimTeamDate: (dateId: string) => void;
  deleteTeamDate: (dateId: string) => void;
  setTeamTab: (tab: KnockAIState['teamTab']) => void;
  updateUser: (updates: Partial<User>) => void;
  updateTeam: (updates: Partial<Team>) => void;
  updateMemberRole: (userId: string, role: UserRole) => void;
  createTeam: (name: string) => Promise<void>;
  joinTeam: (code: string) => Promise<{ ok: boolean; error?: string }>;
  leaveTeam: () => void;
  deleteTeam: () => void;
  restorePin: (id: string) => void;
  restoreTeam: (teamId: string) => void;
  setTeamSettings: (s: Partial<KnockAIState['teamSettings']>) => void;
  addTrailPoint: (point: { lat: number; lng: number }) => void;
  removeTrailPointsNear: (lat: number, lng: number, radiusM: number) => void;
  clearMyTrail: () => void;
  setTrailView: (view: 'mine' | 'team' | 'off') => void;
  addTeamDrawing: (drawing: TeamDrawing) => void;
  removeTeamDrawing: (id: string) => void;
  pushToTeam: () => void;
  loadTeamDrawings: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setDailyGoals: (goals: { doors: number; sales: number }) => void;
  pollTeamPins: () => Promise<void>;
  updateMyTeamStats: () => void;
  setNotifications: (notifs: Partial<KnockAIState['notifications']>) => void;
  setMapTheme: (theme: 'light' | 'dark') => void;
  pollTeamData: () => Promise<void>;
}

const DEMO_USER: User = {
  id: 'user-1',
  email: 'demo@knockai.com',
  fullName: 'Alex Johnson',
  teamId: 'team-1',
  role: 'manager',
  language: 'en',
  distanceUnit: 'miles',
  aiEnabled: true,
  nameChangesUsed: 0,
};

const DEMO_TEAM: Team = {
  id: 'team-1',
  name: 'Alpha Squad',
  inviteCode: 'KNK7X2',
  ownerId: 'user-2',
};

const DEMO_MEMBERS: TeamMember[] = [
  { id: 'user-1', fullName: 'Alex Johnson', email: 'demo@knockai.com', role: 'manager', isOnline: true, lat: 37.775, lng: -122.418 },
  { id: 'user-2', fullName: 'Sarah Chen', email: 'sarah@knockai.com', role: 'owner', isOnline: true, lat: 37.776, lng: -122.419 },
  { id: 'user-3', fullName: 'Marcus Williams', email: 'marcus@knockai.com', role: 'member', isOnline: false, lat: 37.773, lng: -122.416 },
  { id: 'user-4', fullName: 'Emily Rodriguez', email: 'emily@knockai.com', role: 'member', isOnline: true, lat: 37.777, lng: -122.420 },
];

export const useKnockAIStore = create<KnockAIState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      authScreen: 'splash',
      activeTab: 'home',
      isClockedIn: false,
      isPaused: false,
      clockInTime: null,
      pausedAt: null,
      accumulatedSeconds: 0,
      sessions: [],
      currentSession: null,
      pins: [],
      routes: [],
      team: null,
      teamMembers: [],
      teamDates: [],
      teamTab: 'members',
      mapCenter: { lat: 37.7751, lng: -122.4180 },
      mapZoom: 17,
      userLocation: null,
      pinFilter: 'all',
      aiEnabled: true,
      addPinModal: { open: false },
      editPinModal: { open: false },
      statsModal: false,
      settingsSection: null,
      notifications: { push: true, chat: true, routes: true, aiAlerts: true },
      mapTheme: 'light',
      isOnline: true,
      dailyGoals: { doors: 20, sales: 3 },
      trailPoints: [],
      trailView: 'mine',
      teamDrawings: [],
      trashedPins: [],
      trashedTeams: [],
      teamSettings: { shareLocation: true, showMemberTrails: true, salesNotif: true, dailyGoalSync: false, cities: [] },
      liveLocations: [],

      setAuthScreen: (screen) => set({ authScreen: screen }),

      login: async (email, password) => {
        if (email === 'demo@knockai.com' && password === 'password') {
          set({
            user: DEMO_USER,
            isAuthenticated: true,
            team: DEMO_TEAM,
            teamMembers: DEMO_MEMBERS,
            teamDates: [],
            pins: [],
            sessions: [],
            routes: [],
          });
          return { ok: true };
        }

        try {
          const res = await fetch('/api/knockai/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const json = await res.json();
          if (!res.ok) return { ok: false, error: json.error || 'Login failed' };

          const { userData } = json;
          const u = userData?.user;
          if (!u) return { ok: false, error: 'Account data not found' };

          set({
            user: u,
            isAuthenticated: true,
            pins: userData.pins || [],
            sessions: userData.sessions || [],
            routes: userData.routes || [],
            team: userData.team || null,
            teamMembers: userData.teamMembers || [],
          });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Network error — check your connection' };
        }
      },

      signup: async (name, email, password) => {
        try {
          const res = await fetch('/api/knockai/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName: name }),
          });
          const json = await res.json();
          if (!res.ok) return { ok: false, error: json.error || 'Registration failed' };
          return get().login(email, password);
        } catch {
          return { ok: false, error: 'Network error — check your connection' };
        }
      },

      logout: () => {
        fetch('/api/knockai/auth/logout', { method: 'POST' }).catch(() => {});
        set({
          user: null, isAuthenticated: false, authScreen: 'login',
          isClockedIn: false, isPaused: false, clockInTime: null, pausedAt: null, accumulatedSeconds: 0,
          currentSession: null, pins: [], sessions: [], routes: [], teamDates: [], team: null, teamMembers: [],
          trailPoints: [],
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      clockIn: () => {
        const now = new Date().toISOString();
        const session: Session = {
          id: randomId('session'),
          userId: get().user?.id || '',
          clockInAt: now,
          distanceMeters: 0,
          doorsKnocked: 0,
          salesMade: 0,
          date: localDateKey(),
        };
        set((state) => ({
          isClockedIn: true, isPaused: false, clockInTime: now, pausedAt: null, accumulatedSeconds: 0, currentSession: session,
          teamMembers: state.user
            ? state.teamMembers.map((m) => m.id === state.user!.id ? { ...m, isOnline: true } : m)
            : state.teamMembers,
        }));
      },

      clockOut: () => {
        const { clockInTime, accumulatedSeconds, currentSession, pins } = get();
        const now = new Date();
        const activeSecs = clockInTime ? Math.floor((now.getTime() - new Date(clockInTime).getTime()) / 1000) : 0;
        const totalSecs = accumulatedSeconds + activeSecs;
        const sessionStart = currentSession?.clockInAt ? new Date(currentSession.clockInAt).getTime() : 0;
        const sessionPins = pins.filter((p) => new Date(p.placedAt).getTime() >= sessionStart);
        const doorsKnocked = sessionPins.length;
        const salesMade = sessionPins.filter((p) => p.type === 'sale').length;
        const completed: Session = currentSession
          ? { ...currentSession, clockOutAt: now.toISOString(), durationSeconds: totalSecs, doorsKnocked, salesMade }
          : { id: randomId('session'), userId: get().user?.id || '', clockInAt: now.toISOString(), clockOutAt: now.toISOString(), durationSeconds: totalSecs, distanceMeters: 0, doorsKnocked, salesMade, date: localDateKey(now) };
        set((state) => ({
          isClockedIn: false, isPaused: false, clockInTime: null, pausedAt: null, accumulatedSeconds: 0, currentSession: null,
          sessions: [...state.sessions, completed],
          teamMembers: state.user
            ? state.teamMembers.map((m) => m.id === state.user!.id ? { ...m, isOnline: false } : m)
            : state.teamMembers,
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
      },

      pauseClock: () => {
        const { clockInTime, accumulatedSeconds } = get();
        const now = new Date();
        const activeSecs = clockInTime ? Math.floor((now.getTime() - new Date(clockInTime).getTime()) / 1000) : 0;
        set({ isPaused: true, clockInTime: null, pausedAt: now.toISOString(), accumulatedSeconds: accumulatedSeconds + activeSecs });
      },

      resumeClock: () => {
        set({ isPaused: false, clockInTime: new Date().toISOString(), pausedAt: null });
      },

      addPin: (pinData) => {
        const { user, team } = get();
        const pin: Pin = {
          ...pinData,
          id: randomId('pin'),
          userId: user?.id || '',
          placedByName: user?.fullName || 'Unknown',
          placedAt: new Date().toISOString(),
          teamId: pinData.teamId ?? team?.id,
        };
        set((state) => ({ pins: [...state.pins, pin] }));
        get().updateMyTeamStats();
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user }, s.team?.id, s.team ? { team: s.team, teamMembers: s.teamMembers, routes: s.routes } : undefined);
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
        // Supabase realtime broadcast (fire and forget)
        if (pin.teamId) {
          fetch('/api/knockai/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }).catch(() => {});
        }
        // Broadcast sale to teammates via Supabase channel
        if (pin.type === 'sale' && s.team?.id && s.user?.id) {
          const supabase = getSupabaseClient();
          if (supabase) {
            const ch = supabase.channel(`team:${s.team.id}`);
            ch.subscribe((status) => {
              if (status !== 'SUBSCRIBED') return;
              ch.send({ type: 'broadcast', event: 'sale_made', payload: { userId: s.user!.id, userName: s.user!.fullName || '', profilePhotoUrl: s.user!.profilePhotoUrl, address: pin.address || null } }).catch(() => {});
              setTimeout(() => supabase.removeChannel(ch), 2000);
            });
          }
        }
      },

      updatePin: (id, updates) => {
        set((state) => ({ pins: state.pins.map((p) => p.id === id ? { ...p, ...updates } : p) }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
        // Supabase realtime broadcast (fire and forget)
        const updatedPin = s.pins.find((p) => p.id === id);
        if (updatedPin?.teamId) {
          fetch('/api/knockai/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: updatedPin }) }).catch(() => {});
        }
      },

      deletePin: (id) => {
        const pin = get().pins.find((p) => p.id === id);
        const now = Date.now();
        set((state) => ({
          pins: state.pins.filter((p) => p.id !== id),
          trashedPins: pin
            ? [...state.trashedPins.filter((p) => now - new Date(p.deletedAt).getTime() < 30 * 86400000), { ...pin, deletedAt: new Date().toISOString() }]
            : state.trashedPins,
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
        // Supabase realtime broadcast (fire and forget)
        if (pin?.teamId) {
          fetch('/api/knockai/pins', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
        }
      },

      restorePin: (id) => {
        const { trashedPins } = get();
        const pin = trashedPins.find((p) => p.id === id);
        if (!pin) return;
        const { deletedAt, ...restoredPin } = pin;
        set((state) => ({
          pins: [...state.pins, restoredPin],
          trashedPins: state.trashedPins.filter((p) => p.id !== id),
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
      },

      addRoute: (routeData) => {
        const { user } = get();
        const route: Route = {
          ...routeData,
          id: randomId('route'),
          userId: user?.id || '',
          placedByName: user?.fullName || 'Unknown',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ routes: [...state.routes, route] }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      deleteRoute: (id) => {
        set((state) => ({ routes: state.routes.filter((r) => r.id !== id) }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      setUserLocation: (loc) => set({ userLocation: loc }),
      setPinFilter: (filter) => set({ pinFilter: filter }),
      toggleAI: () => set((state) => ({ aiEnabled: !state.aiEnabled })),

      openAddPinModal: (lat, lng) => set({ addPinModal: { open: true, lat, lng } }),
      closeAddPinModal: () => set({ addPinModal: { open: false } }),
      openEditPinModal: (pin) => set({ editPinModal: { open: true, pin } }),
      closeEditPinModal: () => set({ editPinModal: { open: false } }),
      setStatsModal: (open) => set({ statsModal: open }),
      setSettingsSection: (section) => set({ settingsSection: section }),

      addTeamDate: (dateData) => {
        const date: TeamDate = { ...dateData, id: randomId('date') };
        set((state) => ({ teamDates: [...state.teamDates, date] }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      addTeamDay: (day, createdBy, createdByName, teamId) => {
        const groupId = randomId('daygroup');
        const times = ['08:30', '12:00', '15:00'];
        const newDates: TeamDate[] = times.map((time) => ({
          id: randomId('date'),
          date: day,
          time,
          city: '',
          createdBy,
          createdByName,
          teamId,
          dayGroupId: groupId,
        }));
        set((state) => ({ teamDates: [...state.teamDates, ...newDates] }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      claimTeamDate: (dateId, city?) => {
        const { user, teamDates } = get();
        if (!user) return;
        const target = teamDates.find((d) => d.id === dateId);
        if (!target) return;
        const effectiveCity = city || target.city;
        set((state) => ({
          teamDates: state.teamDates.map((d) => {
            if (d.id === dateId && !d.claimedBy) {
              return { ...d, city: effectiveCity, claimedBy: user.id, claimedByName: user.fullName, claimedAt: new Date().toISOString() };
            }
            if (target.dayGroupId && d.dayGroupId === target.dayGroupId && d.id !== dateId && !d.claimedBy && effectiveCity) {
              return { ...d, city: effectiveCity, cityLocked: true };
            }
            return d;
          }),
        }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      unclaimTeamDate: (dateId) => {
        const { user } = get();
        if (!user) return;
        set((state) => ({
          teamDates: state.teamDates.map((d) =>
            d.id === dateId && (d.claimedBy === user.id || user.role === 'owner' || user.role === 'manager')
              ? { ...d, claimedBy: undefined, claimedByName: undefined, claimedAt: undefined }
              : d
          ),
        }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      deleteTeamDate: (dateId) => {
        set((state) => ({ teamDates: state.teamDates.filter((d) => d.id !== dateId) }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      setTeamTab: (tab) => set({ teamTab: tab }),

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
          teamMembers: state.user
            ? state.teamMembers.map((m) => m.id === state.user!.id ? {
                ...m,
                ...(updates.fullName && { fullName: updates.fullName }),
                ...(updates.profilePhotoUrl !== undefined && { profilePhotoUrl: updates.profilePhotoUrl }),
              } : m)
            : state.teamMembers,
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
      },

      updateTeam: (updates) => {
        set((state) => ({
          team: state.team ? { ...state.team, ...updates } : null,
        }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === s.user?.id), s.trailPoints.filter((p) => p.userId === s.user?.id));
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
      },

      updateMemberRole: (userId, role) => set((state) => ({
        teamMembers: state.teamMembers.map((m) => m.id === userId ? { ...m, role } : m),
        user: state.user?.id === userId ? { ...state.user, role } : state.user,
      })),

      createTeam: async (name) => {
        const { user } = get();
        const team: Team = {
          id: randomId('team'),
          name,
          inviteCode: randomInviteCode(),
          ownerId: user?.id || '',
        };
        const members = user ? [{ id: user.id, fullName: user.fullName, email: user.email, role: 'owner' as const, isOnline: true }] : [];
        set((state) => ({
          team,
          user: state.user ? { ...state.user, teamId: team.id, role: 'owner' } : null,
          teamMembers: members,
        }));
        try {
          await fetch('/api/knockai/team/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team, teamMembers: members }),
          });
        } catch { /* offline */ }
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
      },

      joinTeam: async (code) => {
        if (code.toUpperCase() === DEMO_TEAM.inviteCode) {
          set((state) => ({
            team: DEMO_TEAM,
            teamMembers: DEMO_MEMBERS,
            user: state.user ? { ...state.user, teamId: DEMO_TEAM.id, role: 'member' } : null,
          }));
          return { ok: true };
        }
        try {
          const { user } = get();
          const res = await fetch('/api/knockai/team/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteCode: code.toUpperCase(), user }),
          });
          const json = await res.json();
          if (!res.ok) return { ok: false, error: json.error || 'Code invalide' };
          set((state) => ({
            team: json.team,
            teamMembers: json.teamMembers || [],
            teamDates: json.teamDates || [],
            routes: json.routes || [],
            pins: [
              ...state.pins.filter((p) => p.userId === state.user?.id),
              ...(json.teamPins || []).filter((p: any) => p.userId !== state.user?.id),
            ],
            teamDrawings: json.drawings || [],
            user: state.user ? { ...state.user, teamId: json.team.id, role: 'member' } : null,
          }));
          const s = get();
          if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Erreur réseau' };
        }
      },

      leaveTeam: () => set((state) => ({
        team: null,
        teamMembers: [],
        user: state.user ? { ...state.user, teamId: undefined, role: 'member' } : null,
      })),

      deleteTeam: () => {
        const { team, teamMembers } = get();
        if (!team) return;
        const now = Date.now();
        const entry: TrashedTeam = { team, memberCount: teamMembers.length, deletedAt: new Date().toISOString() };
        set((state) => ({
          team: null,
          teamMembers: [],
          user: state.user ? { ...state.user, teamId: undefined, role: 'member' } : null,
          trashedTeams: [...state.trashedTeams.filter((e) => now - new Date(e.deletedAt).getTime() < 30 * 86400000), entry],
        }));
      },

      restoreTeam: (teamId) => {
        const { trashedTeams } = get();
        const entry = trashedTeams.find((e) => e.team.id === teamId);
        if (!entry) return;
        set((state) => ({
          team: entry.team,
          user: state.user ? { ...state.user, teamId: entry.team.id, role: 'owner' } : null,
          trashedTeams: state.trashedTeams.filter((e) => e.team.id !== teamId),
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, user: s.user });
      },

      setTeamSettings: (s) => set((state) => ({ teamSettings: { ...state.teamSettings, ...s } })),

      addTrailPoint: (point) => {
        const { user } = get();
        if (!user) return;
        const tp: TrailPoint = { ...point, timestamp: new Date().toISOString(), userId: user.id };
        set((state) => ({ trailPoints: [...state.trailPoints, tp] }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, s.pins.filter((p) => p.userId === user.id), s.trailPoints.filter((p) => p.userId === user.id));
      },

      removeTrailPointsNear: (lat, lng, radiusM) => {
        const toRad = (v: number) => v * Math.PI / 180;
        set((state) => ({
          trailPoints: state.trailPoints.filter((p) => {
            const R = 6371000;
            const a = Math.sin(toRad(p.lat - lat) / 2) ** 2
              + Math.cos(toRad(lat)) * Math.cos(toRad(p.lat)) * Math.sin(toRad(p.lng - lng) / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > radiusM;
          }),
        }));
      },

      clearMyTrail: () => {
        const { user } = get();
        set((state) => ({ trailPoints: state.trailPoints.filter((p) => p.userId !== user?.id) }));
      },

      setTrailView: (view) => set({ trailView: view }),

      addTeamDrawing: (drawing) => {
        const { user, team, teamMembers, teamDates, routes, teamDrawings } = get();
        if (!user || !team) return;
        const next = [...teamDrawings.filter((d) => d.id !== drawing.id), drawing];
        set({ teamDrawings: next });
        const myDrawings = next.filter((d) => d.userId === user.id);
        syncTeamToRedis(team.id, teamMembers, teamDates, routes, team, undefined, undefined, myDrawings, user.id);
      },

      removeTeamDrawing: (id) => {
        const { user, team, teamMembers, teamDates, routes, teamDrawings } = get();
        if (!user || !team) return;
        const next = teamDrawings.filter((d) => d.id !== id);
        set({ teamDrawings: next });
        const myDrawings = next.filter((d) => d.userId === user.id);
        syncTeamToRedis(team.id, teamMembers, teamDates, routes, team, undefined, undefined, myDrawings, user.id);
      },

      pushToTeam: () => {
        const { user, team, teamMembers, teamDates, routes, pins, trailPoints, teamDrawings } = get();
        if (!user || !team) return;
        syncTeamToRedis(
          team.id, teamMembers, teamDates, routes, team,
          pins.filter((p) => p.userId === user.id),
          trailPoints.filter((p) => p.userId === user.id),
          teamDrawings.filter((d) => d.userId === user.id),
          user.id
        );
      },

      loadTeamDrawings: async () => {
        const { team, user } = get();
        if (!team?.id) return;
        try {
          const res = await fetch(`/api/knockai/drawings?teamId=${team.id}`);
          if (!res.ok) return;
          const json = await res.json();
          if (!json.drawings || !Array.isArray(json.drawings) || json.drawings.length === 0) return;
          const remote: TeamDrawing[] = json.drawings;
          set((state) => {
            const byId = new Map<string, TeamDrawing>(state.teamDrawings.map((d) => [d.id, d]));
            remote.forEach((d) => { if (!byId.has(d.id)) byId.set(d.id, d); });
            return { teamDrawings: Array.from(byId.values()) };
          });
          // Push own drawings (including newly loaded from Supabase) to Redis
          const s = get();
          if (s.user && s.team) {
            const myDrawings = s.teamDrawings.filter((d) => d.userId === s.user!.id);
            if (myDrawings.length > 0) {
              syncTeamToRedis(s.team.id, s.teamMembers, s.teamDates, s.routes, s.team, undefined, undefined, myDrawings, s.user.id);
            }
          }
        } catch { /* offline */ }
      },

      setOnline: (online) => set({ isOnline: online }),
      setDailyGoals: (goals) => set({ dailyGoals: goals }),

      pollTeamPins: async () => {
        const { team, user } = get();
        if (!team?.id) return;
        try {
          const res = await fetch(`/api/knockai/team/pins?teamId=${team.id}`);
          if (!res.ok) return;
          const json = await res.json();
          if (json.skipped || !json.pins) return;
          const remotePins: Pin[] = json.pins;
          const myId = user?.id;
          set((state) => ({
            pins: [
              ...state.pins.filter((p) => p.userId === myId),
              ...remotePins.filter((p) => p.userId !== myId),
            ],
          }));
        } catch { /* offline */ }
      },

      updateMyTeamStats: () => {
        const { user, pins, teamMembers, team } = get();
        if (!user || !team) return;
        const today = new Date().toISOString().split('T')[0];
        const todayPins = pins.filter((p) => p.userId === user.id && p.placedAt.startsWith(today));
        const doorsToday = todayPins.length;
        const salesToday = todayPins.filter((p) => p.type === 'sale').length;
        const updated = teamMembers.map((m) => m.id === user.id ? { ...m, doorsToday, salesToday } : m);
        set({ teamMembers: updated });
        if (team.id) syncTeamToRedis(team.id, updated, get().teamDates, get().routes, team, pins.filter((p) => p.userId === user.id), get().trailPoints.filter((p) => p.userId === user.id));
      },

      setNotifications: (notifs) => set((state) => ({ notifications: { ...state.notifications, ...notifs } })),
      setMapTheme: (theme) => set({ mapTheme: theme }),

      pollTeamData: async () => {
        const { team, user, teamMembers: prevMembers } = get();
        if (!team?.id) return;
        const data = await pollTeamFromRedis(team.id);
        if (!data) return;
        const myId = user?.id;
        set((state) => ({
          ...(data.teamMembers && data.teamMembers.length > 0 && { teamMembers: data.teamMembers }),
          ...(data.teamDates && { teamDates: data.teamDates }),
          ...(data.routes && { routes: data.routes }),
          ...(data.team && { team: { ...data.team, logoUrl: data.team.logoUrl || state.team?.logoUrl } }),
          ...(data.teamPins && data.teamPins.length > 0 && {
            pins: (() => {
              // Remote (Redis) is authoritative; keep any local-only pins not yet synced
              const byId = new Map((data.teamPins as Pin[]).map((p: Pin) => [p.id, p]));
              state.pins.forEach((p: Pin) => { if (!byId.has(p.id)) byId.set(p.id, p); });
              return Array.from(byId.values());
            })(),
          }),
          ...(data.trailPoints && {
            trailPoints: [
              ...state.trailPoints.filter((p) => p.userId === myId),
              ...(data.trailPoints as TrailPoint[]).filter((p) => p.userId !== myId),
            ],
          }),
          ...(data.drawings && {
            teamDrawings: [
              ...state.teamDrawings.filter((d) => d.userId === myId),
              ...(data.drawings as TeamDrawing[]).filter((d) => d.userId !== myId),
            ],
          }),
        }));
      },
    }),
    {
      name: 'knockai-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isClockedIn: state.isClockedIn,
        isPaused: state.isPaused,
        clockInTime: state.clockInTime,
        pausedAt: state.pausedAt,
        accumulatedSeconds: state.accumulatedSeconds,
        sessions: state.sessions,
        pins: state.pins,
        routes: state.routes,
        team: state.team,
        teamMembers: state.teamMembers,
        teamDates: state.teamDates,
        aiEnabled: state.aiEnabled,
        notifications: state.notifications,
        mapTheme: state.mapTheme,
        trailPoints: state.trailPoints,
        trailView: state.trailView,
        teamDrawings: state.teamDrawings,
        dailyGoals: state.dailyGoals,
        trashedPins: state.trashedPins,
        trashedTeams: state.trashedTeams,
        teamSettings: state.teamSettings,
      }),
    }
  )
);
