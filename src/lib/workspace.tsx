import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ProjectType =
  | "email"
  | "summary"
  | "tasks"
  | "research"
  | "chat";

export interface SavedProject {
  id: string;
  type: ProjectType;
  title: string;
  createdAt: string;
  content: string;
  meta?: Record<string, unknown>;
}

export interface PlannerTask {
  id: string;
  title: string;
  owner?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  due?: string;
  status: "todo" | "in_progress" | "done";
  durationHrs?: number;
  importance?: "important" | "not_important";
  urgency?: "urgent" | "not_urgent";
}

export interface TTSSettings {
  rate: number;
  pitch: number;
  voiceURI: string | null;
  autoRead: boolean;
}

type Theme = "light" | "dark" | "system";

interface WorkspaceCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  tts: TTSSettings;
  setTTS: (s: Partial<TTSSettings>) => void;
  projects: SavedProject[];
  saveProject: (p: Omit<SavedProject, "id" | "createdAt">) => SavedProject;
  deleteProject: (id: string) => void;
  tasks: PlannerTask[];
  addTasks: (t: Omit<PlannerTask, "id">[]) => void;
  updateTask: (id: string, patch: Partial<PlannerTask>) => void;
  deleteTask: (id: string) => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

const LS = {
  theme: "ow_theme",
  tts: "ow_tts",
  projects: "ow_projects",
  tasks: "ow_tasks",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [tts, setTTSState] = useState<TTSSettings>({
    rate: 1,
    pitch: 1,
    voiceURI: null,
    autoRead: false,
  });
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setThemeState(load<Theme>(LS.theme, "system"));
    setTTSState(load<TTSSettings>(LS.tts, { rate: 1, pitch: 1, voiceURI: null, autoRead: false }));
    setProjects(load<SavedProject[]>(LS.projects, []));
    setTasks(load<PlannerTask[]>(LS.tasks, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mql.matches);
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply();
    if (hydrated) save(LS.theme, theme);
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme, hydrated]);

  useEffect(() => { if (hydrated) save(LS.tts, tts); }, [tts, hydrated]);
  useEffect(() => { if (hydrated) save(LS.projects, projects); }, [projects, hydrated]);
  useEffect(() => { if (hydrated) save(LS.tasks, tasks); }, [tasks, hydrated]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () =>
      setThemeState((t) => {
        const isDark =
          t === "dark" ||
          (t === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        return isDark ? "light" : "dark";
      }),
    [],
  );

  const setTTS = useCallback(
    (s: Partial<TTSSettings>) => setTTSState((prev) => ({ ...prev, ...s })),
    [],
  );

  const saveProject = useCallback(
    (p: Omit<SavedProject, "id" | "createdAt">) => {
      const proj: SavedProject = {
        ...p,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [proj, ...prev]);
      return proj;
    },
    [],
  );

  const deleteProject = useCallback(
    (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  const addTasks = useCallback((items: Omit<PlannerTask, "id">[]) => {
    setTasks((prev) => [
      ...items.map((t) => ({ ...t, id: crypto.randomUUID() })),
      ...prev,
    ]);
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<PlannerTask>) =>
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    [],
  );

  const deleteTask = useCallback(
    (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [],
  );

  const value = useMemo<WorkspaceCtx>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      tts,
      setTTS,
      projects,
      saveProject,
      deleteProject,
      tasks,
      addTasks,
      updateTask,
      deleteTask,
    }),
    [theme, setTheme, toggleTheme, tts, setTTS, projects, saveProject, deleteProject, tasks, addTasks, updateTask, deleteTask],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}
