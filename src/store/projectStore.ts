import { create } from 'zustand';
import { getUserProjects, createProject as createProjectAPI, getProjectArticles } from '../lib/firebase';
import type { Project, Article } from '../lib/firebase';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  articles: Article[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
  createProject: (title: string, description?: string) => Promise<{ error?: any }>;
  setCurrentProject: (project: Project | null) => void;
  getProjectById: (projectId: string) => Project | null;
  fetchArticles: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  articles: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    const { data, error } = await getUserProjects();
    if (!error && data) {
      set({ projects: data });
      
      // If current project is not in the updated list, clear it
      const { currentProject } = get();
      if (currentProject && !data.find(p => p.id === currentProject.id)) {
        set({ currentProject: null });
      }
    }
    set({ loading: false });
  },

  createProject: async (title: string, description?: string) => {
    set({ loading: true });
    const { data, error } = await createProjectAPI(title, description);
    
    if (!error && data) {
      const { projects } = get();
      set({ projects: [data, ...projects] });
    }
    
    set({ loading: false });
    return { error };
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project, articles: [] });
  },

  // Add method to get project by ID
  getProjectById: (projectId: string): Project | null => {
    const { projects } = get();
    return projects.find(p => p.id === projectId) || null;
  },

  fetchArticles: async (projectId: string) => {
    set({ loading: true });
    const { data, error } = await getProjectArticles(projectId);
    if (!error && data) {
      set({ articles: data });
    }
    set({ loading: false });
  },
}));