import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[ProjectContext] isAuthenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('[ProjectContext] Not authenticated, setting loading=false');
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      setLoading(true);
      console.log('[ProjectContext] Fetching projects...');
      try {
        const response = await axios.get('/api/v1/projects');
        console.log('[ProjectContext] Projects response:', response.data);
        
        // 支持两种返回格式：{projects: [...]} 或直接数组 [...]
        const rawData = response.data.projects || response.data;
        const data = Array.isArray(rawData) ? rawData : [];
        
        const formattedData = data.map((item: Record<string, unknown>) => ({
          id: String(item.id || item._id || ''),
          name: String(item.name || '未命名项目'),
          apiKey: String(item.api_key || item.apiKey || ''),
          createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
        }));
        setProjects(formattedData);
        
        const savedProjectId = localStorage.getItem('selectedProjectId');
        const savedProject = formattedData.find(p => p.id === savedProjectId);
        if (savedProject) {
          setCurrentProjectState(savedProject);
        } else if (formattedData.length > 0) {
          setCurrentProjectState(formattedData[0]);
        }
        console.log('[ProjectContext] Projects loaded:', formattedData.length);
      } catch (error) {
        console.error('[ProjectContext] Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        console.log('[ProjectContext] Setting loading=false');
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated]);

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem('selectedProjectId', project.id);
  };

  return (
    <ProjectContext.Provider value={{ projects, currentProject, setCurrentProject, loading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
