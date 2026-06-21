import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: { id: string; email: string; first_name?: string; last_name?: string; avatar_url?: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthState["user"]) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuthenticated: false, isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "supportpilot-auth",
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

interface WorkspaceState {
  currentWorkspace: { id: string; name: string; slug: string; plan: string; logo_url?: string | null; is_active: boolean; created_at?: string | null } | null;
  workspaces: Array<{ id: string; name: string; slug: string; plan: string; logo_url?: string | null; is_active: boolean; created_at?: string | null }>;
  isLoading: boolean;
  setCurrentWorkspace: (w: WorkspaceState["currentWorkspace"]) => void;
  setWorkspaces: (w: WorkspaceState["workspaces"]) => void;
  setLoading: (l: boolean) => void;
  addWorkspace: (w: WorkspaceState["workspaces"][0]) => void;
  updateWorkspace: (id: string, u: Partial<WorkspaceState["workspaces"][0]>) => void;
  removeWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null, workspaces: [], isLoading: false,
      setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setLoading: (isLoading) => set({ isLoading }),
      addWorkspace: (w) => set((s) => ({ workspaces: [...s.workspaces, w] })),
      updateWorkspace: (id, u) => set((s) => ({
        workspaces: s.workspaces.map((w) => w.id === id ? { ...w, ...u } : w),
        currentWorkspace: s.currentWorkspace?.id === id ? { ...s.currentWorkspace, ...u } : s.currentWorkspace,
      })),
      removeWorkspace: (id) => set((s) => ({
        workspaces: s.workspaces.filter((w) => w.id !== id),
        currentWorkspace: s.currentWorkspace?.id === id ? null : s.currentWorkspace,
      })),
    }),
    {
      name: "supportpilot-workspace",
      partialize: (state) => ({ currentWorkspace: state.currentWorkspace, workspaces: state.workspaces }),
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (o: boolean) => void;
  toggleSidebarCollapse: () => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (o: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true, sidebarCollapsed: false, theme: "system", commandPaletteOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    { name: "supportpilot-ui" }
  )
);

export interface Notification {
  id: string; title: string; message?: string; type: "info" | "success" | "warning" | "error"; read: boolean; createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [], unreadCount: 0,
  addNotification: (n) => set((s) => ({
    notifications: [{ ...n, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() }, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),
  markAsRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n), unreadCount: Math.max(0, s.unreadCount - 1) })),
  markAllAsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 })),
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
