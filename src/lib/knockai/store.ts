import { create } from 'zustand';
import { persist } from 'zustand/middleware';

async function syncToRedis(email: string, userData: object, teamId?: string, teamData?: object) {
  try {
    await fetch('/api/knockai/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userData, teamId, teamData }),
    });
  } catch { /* offline or Redis not configured */ }
}

async function syncTeamToRedis(teamId: string, teamMembers: object[], chatMessages: object[], routes: object[], team?: object) {
  try {
    await fetch('/api/knockai/team/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, teamMembers, chatMessages, routes, team }),
    });
  } catch { /* offline */ }
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

export interface SaleNotification {
  id: string;
  memberName: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
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
  chatMessages: ChatMessage[];
  teamTab: 'members' | 'chat' | 'routes' | 'leaderboard';

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
  saleNotifications: SaleNotification[];
  trailPoints: TrailPoint[];
  trailView: 'mine' | 'team' | 'off';
  trashedPins: TrashedPin[];
  trashedTeams: TrashedTeam[];
  teamSettings: { shareLocation: boolean; showMemberTrails: boolean; salesNotif: boolean; dailyGoalSync: boolean };

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
  sendChatMessage: (text: string) => void;
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
  setOnline: (online: boolean) => void;
  setDailyGoals: (goals: { doors: number; sales: number }) => void;
  dismissSaleNotification: (id: string) => void;
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
      chatMessages: [],
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
      saleNotifications: [],
      trailPoints: [],
      trailView: 'mine',
      trashedPins: [],
      trashedTeams: [],
      teamSettings: { shareLocation: true, showMemberTrails: true, salesNotif: true, dailyGoalSync: false },

      setAuthScreen: (screen) => set({ authScreen: screen }),

      login: async (email, password) => {
        if (email === 'demo@knockai.com' && password === 'password') {
          set({
            user: DEMO_USER,
            isAuthenticated: true,
            team: DEMO_TEAM,
            teamMembers: DEMO_MEMBERS,
            chatMessages: [],
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
            chatMessages: userData.chatMessages || [],
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

      logout: () => set({
        user: null, isAuthenticated: false, authScreen: 'login',
        isClockedIn: false, isPaused: false, clockInTime: null, pausedAt: null, accumulatedSeconds: 0,
        currentSession: null, pins: [], sessions: [], routes: [], chatMessages: [], team: null, teamMembers: [],
        trailPoints: [],
      }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      clockIn: () => {
        const now = new Date().toISOString();
        const session: Session = {
          id: `session-${Date.now()}`,
          userId: get().user?.id || '',
          clockInAt: now,
          distanceMeters: 0,
          doorsKnocked: 0,
          salesMade: 0,
          date: now.split('T')[0],
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
          : { id: `session-${Date.now()}`, userId: get().user?.id || '', clockInAt: now.toISOString(), clockOutAt: now.toISOString(), durationSeconds: totalSecs, distanceMeters: 0, doorsKnocked, salesMade, date: now.toISOString().split('T')[0] };
        set((state) => ({
          isClockedIn: false, isPaused: false, clockInTime: null, pausedAt: null, accumulatedSeconds: 0, currentSession: null,
          sessions: [...state.sessions, completed],
          teamMembers: state.user
            ? state.teamMembers.map((m) => m.id === state.user!.id ? { ...m, isOnline: false } : m)
            : state.teamMembers,
        }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
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
        const { user } = get();
        const pin: Pin = {
          ...pinData,
          id: `pin-${Date.now()}`,
          userId: user?.id || '',
          placedByName: user?.fullName || 'Unknown',
          placedAt: new Date().toISOString(),
        };
        set((state) => ({ pins: [...state.pins, pin] }));
        get().updateMyTeamStats();
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user }, s.team?.id, s.team ? { team: s.team, teamMembers: s.teamMembers, routes: s.routes, chatMessages: s.chatMessages } : undefined);
      },

      updatePin: (id, updates) => {
        set((state) => ({ pins: state.pins.map((p) => p.id === id ? { ...p, ...updates } : p) }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
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
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
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
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
      },

      addRoute: (routeData) => {
        const { user } = get();
        const route: Route = {
          ...routeData,
          id: `route-${Date.now()}`,
          userId: user?.id || '',
          placedByName: user?.fullName || 'Unknown',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ routes: [...state.routes, route] }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.chatMessages, s.routes, s.team);
      },

      deleteRoute: (id) => {
        set((state) => ({ routes: state.routes.filter((r) => r.id !== id) }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.chatMessages, s.routes, s.team);
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

      sendChatMessage: (text) => {
        const { user } = get();
        if (!user) return;
        const msg: ChatMessage = { id: `msg-${Date.now()}`, userId: user.id, userName: user.fullName, text, timestamp: new Date().toISOString() };
        set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
        const s = get();
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.chatMessages, s.routes, s.team);
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
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.chatMessages, s.routes, s.team);
      },

      updateTeam: (updates) => {
        set((state) => ({
          team: state.team ? { ...state.team, ...updates } : null,
        }));
        const s = get();
        if (s.team?.id) syncTeamToRedis(s.team.id, s.teamMembers, s.chatMessages, s.routes, s.team);
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
      },

      updateMemberRole: (userId, role) => set((state) => ({
        teamMembers: state.teamMembers.map((m) => m.id === userId ? { ...m, role } : m),
        user: state.user?.id === userId ? { ...state.user, role } : state.user,
      })),

      createTeam: async (name) => {
        const { user } = get();
        const team: Team = {
          id: `team-${Date.now()}`,
          name,
          inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
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
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
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
            chatMessages: json.chatMessages || [],
            routes: json.routes || [],
            user: state.user ? { ...state.user, teamId: json.team.id, role: 'member' } : null,
          }));
          const s = get();
          if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
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
        if (s.user?.email) syncToRedis(s.user.email, { pins: s.pins, sessions: s.sessions, routes: s.routes, team: s.team, teamMembers: s.teamMembers, chatMessages: s.chatMessages, user: s.user });
      },

      setTeamSettings: (s) => set((state) => ({ teamSettings: { ...state.teamSettings, ...s } })),

      addTrailPoint: (point) => {
        const { user } = get();
        if (!user) return;
        const tp: TrailPoint = { ...point, timestamp: new Date().toISOString(), userId: user.id };
        set((state) => ({ trailPoints: [...state.trailPoints, tp] }));
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
      setOnline: (online) => set({ isOnline: online }),
      setDailyGoals: (goals) => set({ dailyGoals: goals }),
      dismissSaleNotification: (id) => set((state) => ({ saleNotifications: state.saleNotifications.filter((n) => n.id !== id) })),

      updateMyTeamStats: () => {
        const { user, pins, teamMembers, team } = get();
        if (!user || !team) return;
        const today = new Date().toISOString().split('T')[0];
        const todayPins = pins.filter((p) => p.userId === user.id && p.placedAt.startsWith(today));
        const doorsToday = todayPins.length;
        const salesToday = todayPins.filter((p) => p.type === 'sale').length;
        const updated = teamMembers.map((m) => m.id === user.id ? { ...m, doorsToday, salesToday } : m);
        set({ teamMembers: updated });
        if (team.id) syncTeamToRedis(team.id, updated, get().chatMessages, get().routes, team);
      },

      setNotifications: (notifs) => set((state) => ({ notifications: { ...state.notifications, ...notifs } })),
      setMapTheme: (theme) => set({ mapTheme: theme }),

      pollTeamData: async () => {
        const { team, user, teamMembers: prevMembers } = get();
        if (!team?.id) return;
        const data = await pollTeamFromRedis(team.id);
        if (!data) return;
        if (data.teamMembers) {
          data.teamMembers.forEach((newM: TeamMember) => {
            if (newM.id === user?.id) return;
            const prev = prevMembers.find((m) => m.id === newM.id);
            if (prev && (newM.salesToday || 0) > (prev.salesToday || 0)) {
              const notif: SaleNotification = {
                id: `notif-${Date.now()}-${newM.id}`,
                memberName: newM.fullName,
                lat: newM.lat || 0,
                lng: newM.lng || 0,
                timestamp: new Date().toISOString(),
              };
              set((state) => ({ saleNotifications: [...state.saleNotifications, notif] }));
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification(`🎉 ${newM.fullName} a fait une vente!`, { body: 'Nouvelle vente enregistrée', icon: '/icon.png' });
              }
            }
          });
        }
        set((state) => ({
          ...(data.teamMembers && data.teamMembers.length > 0 && { teamMembers: data.teamMembers }),
          ...(data.chatMessages && { chatMessages: data.chatMessages }),
          ...(data.routes && { routes: data.routes }),
          ...(data.team && { team: { ...data.team, logoUrl: data.team.logoUrl || state.team?.logoUrl } }),
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
        chatMessages: state.chatMessages,
        aiEnabled: state.aiEnabled,
        notifications: state.notifications,
        mapTheme: state.mapTheme,
        trailPoints: state.trailPoints,
        trailView: state.trailView,
        dailyGoals: state.dailyGoals,
        trashedPins: state.trashedPins,
        trashedTeams: state.trashedTeams,
        teamSettings: state.teamSettings,
      }),
    }
  )
);
