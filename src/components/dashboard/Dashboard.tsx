import React, { useEffect, useState } from 'react';
import { Plus, FileText, Users, TrendingUp, Settings, LogOut, Wand2, MessageSquare, CreditCard, Search, Target, BarChart3, Link, Eye, Hash } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import ProjectCard from './ProjectCard';
import StatsCard from './StatsCard';
import CreateProjectModal from './CreateProjectModal';
import InvitationsPanel from './InvitationsPanel';
import { useNotification } from '../../hooks/useNotification';
import { getUserStats } from '../../lib/firebase';
import type { UserStats } from '../../lib/firebase';

const Dashboard: React.FC = () => {
  const { user, userProfile, signOut } = useAuthStore();
  const { projects, fetchProjects, loading } = useProjectStore();
  const { showNotification } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    loadUserStats();
  }, [fetchProjects]);

  const loadUserStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await getUserStats();
      if (error) throw error;
      setUserStats(data);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    showNotification('Signed out successfully', 'success');
  };

  const handleNavigation = (path: string) => {
    window.location.hash = `#/${path}`;
  };

  const handleProjectDeleted = () => {
    // Refresh the projects list, stats, and clear current project when a project is deleted
    fetchProjects();
    loadUserStats();
    
    // Force refresh of project store to ensure UI updates
    setTimeout(() => {
      const { currentProject, setCurrentProject } = useProjectStore.getState();
      if (currentProject) {
        const updatedProjects = useProjectStore.getState().projects;
        const projectStillExists = updatedProjects.find(p => p.id === currentProject.id);
        if (!projectStillExists) {
          setCurrentProject(null);
        }
      }
    }, 500);
  };

  const stats = [
    {
      title: 'Total Projects',
      value: statsLoading ? '...' : (userStats?.totalProjects || 0).toString(),
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Articles Created',
      value: statsLoading ? '...' : (userStats?.totalArticles || 0).toString(),
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'AI Credits Used',
      value: statsLoading ? '...' : `${userStats?.usageCount || 0}/${userStats?.usageLimit || 5}`,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Content Briefs',
      value: statsLoading ? '...' : (userStats?.totalBriefs || 0).toString(),
      icon: Users,
      color: 'from-orange-500 to-red-500',
    },
  ];

  const quickActions = [
    {
      title: 'AI Content Generator',
      description: 'Create new articles with AI',
      icon: Wand2,
      color: 'from-purple-500 to-pink-500',
      action: () => setShowCreateModal(true)
    },
    {
      title: 'Content Brief Generator',
      description: 'Generate detailed content briefs',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      action: () => handleNavigation('brief-generator')
    },
    {
      title: 'Team Collaboration',
      description: 'Manage team and projects',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      action: () => handleNavigation('team')
    },
    {
      title: 'Upgrade Plan',
      description: 'Unlock premium features',
      icon: CreditCard,
      color: 'from-orange-500 to-red-500',
      action: () => handleNavigation('pricing')
    }
  ];

  const seoTools = [
    {
      title: 'Meta Tag Generator',
      description: 'Generate SEO-optimized meta tags',
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
      action: () => handleNavigation('seo-tools/meta-generator')
    },
    {
      title: 'Content Ideas',
      description: 'AI-powered content suggestions',
      icon: Target,
      color: 'from-green-500 to-emerald-500',
      action: () => handleNavigation('seo-tools/content-ideas')
    },
    {
      title: 'Keyword Research',
      description: 'Find long-tail keywords',
      icon: Hash,
      color: 'from-purple-500 to-pink-500',
      action: () => handleNavigation('seo-tools/keyword-suggestions')
    },
    {
      title: 'SEO Analyzer',
      description: 'Analyze on-page SEO',
      icon: BarChart3,
      color: 'from-orange-500 to-red-500',
      action: () => handleNavigation('seo-tools/seo-analyzer')
    },
    {
      title: 'SERP Preview',
      description: 'Preview search results',
      icon: Eye,
      color: 'from-indigo-500 to-purple-500',
      action: () => handleNavigation('seo-tools/serp-preview')
    },
    {
      title: 'Backlink Ideas',
      description: 'Find backlink opportunities',
      icon: Link,
      color: 'from-teal-500 to-green-500',
      action: () => handleNavigation('seo-tools/backlink-suggestions')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-4 sm:py-0">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <div className="flex items-center space-x-2">
                <img src="/ranksup-logo.svg" alt="RankSup" className="w-8 h-8" />
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  RankSup
                </h1>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm sm:text-base text-gray-600">Welcome back, {userProfile?.full_name || user?.email}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-2 bg-purple-100 px-2 sm:px-3 py-1 rounded-full">
                <span className="text-xs sm:text-sm font-medium text-purple-700">
                  {userProfile?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <button 
                onClick={() => handleNavigation('settings')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Get started with these popular features</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${action.color} mb-2 sm:mb-3`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEO Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">SEO Tools</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Powerful AI-driven SEO optimization tools</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {seoTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={tool.action}
                    className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${tool.color} mb-2 sm:mb-3`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{tool.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Projects Section */}
        {/* Invitations Section */}
        <InvitationsPanel />

        {/* Projects Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Your Projects</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your content projects and articles</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-6">Create your first project to start generating AI-powered content</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Create Your First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {projects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onProjectDeleted={handleProjectDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default Dashboard;