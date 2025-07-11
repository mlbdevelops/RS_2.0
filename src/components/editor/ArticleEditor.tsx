import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Wand2, Eye, Settings, ArrowLeft, MessageSquare, Users, FileText, Menu, X, Type, Hash, Palette, Bold, Italic, List, ListOrdered, Quote, Link as LinkIcon, Heading1, Heading2, Heading3, Code, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Undo, Redo, Image, Table, Maximize2, Minimize2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { generateContent } from '../../lib/gemini';
import { createArticle, updateArticle, canUserEditProject, getProjectArticles } from '../../lib/firebase';
import { useNotification } from '../../hooks/useNotification';
import RichTextEditor from './RichTextEditor';
import SEOPanel from './SEOPanel';
import ContentBriefPanel from './ContentBriefPanel';
import CommentsPanel from './CommentsPanel';
import type { Article } from '../../lib/firebase';

// Utility function to extract project ID from URL hash
const getCurrentProjectId = (): string | null => {
  const hash = window.location.hash;
  const match = hash.match(/#\/project\/([^\/]+)/);
  return match ? match[1] : null;
};

const ArticleEditor: React.FC = () => {
  const { currentProject } = useProjectStore();
  const { userProfile, incrementUsage } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [title, setTitle] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSEOPanel, setShowSEOPanel] = useState(false);
  const [showBriefPanel, setShowBriefPanel] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showArticlesList, setShowArticlesList] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(getCurrentProjectId());

  useEffect(() => {
    const handleHashChange = () => {
      const newProjectId = getCurrentProjectId();
      setProjectId(newProjectId);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (projectId && !currentProject) {
      // Try to find the project in the store first
      const { projects } = useProjectStore.getState();
      const foundProject = projects.find(p => p.id === projectId);
      if (foundProject) {
        setCurrentProject(foundProject);
      } else {
        // If project not found, redirect to dashboard
        console.warn('Project not found, redirecting to dashboard');
        window.location.hash = '#/dashboard';
        return;
      }
    }
    
    if (currentProject && projectId === currentProject.id) {
      checkPermissions();
      loadArticles();
    }
  }, [currentProject, projectId]);

  // Simple content change handler without debouncing
  const handleContentChange = useCallback((content: string) => {
    setEditorContent(content);
    
    // Update word and character count immediately
    const text = content.replace(/<[^>]*>/g, '');
    setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
    setCharCount(text.length);
  }, []);
  const checkPermissions = async () => {
    if (currentProject) {
      const canEditProject = await canUserEditProject(currentProject.id);
      setCanEdit(canEditProject);
    }
  };

  const loadArticles = async () => {
    if (!currentProject) return;
    
    setLoadingArticles(true);
    try {
      const { data, error } = await getProjectArticles(currentProject.id);
      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      showNotification('Failed to load articles', 'error');
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!title.trim()) {
      showNotification('Please enter a title first', 'error');
      return;
    }

    if (!canEdit) {
      showNotification('You do not have permission to edit this project', 'error');
      return;
    }

    if (!userProfile) {
      showNotification('Please sign in to use AI features', 'error');
      return;
    }

    if (userProfile.usage_count >= userProfile.usage_limit) {
      showNotification('You have reached your AI generation limit. Please upgrade to continue.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const lengthPrompt = contentLength === 'short' ? ' (400-600 words)' : 
                          contentLength === 'medium' ? ' (800-1200 words)' : 
                          ' (1500-2000 words)';
      
      const keywordPrompt = targetKeyword ? ` focusing on the keyword "${targetKeyword}"` : '';
      const fullPrompt = title + lengthPrompt + keywordPrompt;
      
      const content = await generateContent(fullPrompt, 'article');
      setEditorContent(content);
      
      // Increment usage count
      await incrementUsage();
      
      showNotification('Content generated successfully!', 'success');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          showNotification('Gemini API rate limit exceeded. Please wait a few minutes before trying again.', 'error');
        } else if (error.message.includes('API key')) {
          showNotification('Gemini API configuration error. Please check your settings.', 'error');
        } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
          showNotification('Gemini API is temporarily overloaded. Please try again in a few minutes.', 'error');
        } else {
          showNotification(error.message || 'Failed to generate content. Please try again.', 'error');
        }
      } else {
        showNotification('Failed to generate content. Please try again.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !editorContent.trim()) {
      showNotification('Please enter a title and content', 'error');
      return;
    }

    if (!currentProject) {
      showNotification('No project selected', 'error');
      return;
    }

    if (!canEdit) {
      showNotification('You do not have permission to edit this project', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const content = editorContent;
      
      if (currentArticleId) {
        const { error } = await updateArticle(currentArticleId, {
          title: title.trim(),
          content,
        });
        
        if (error) {
          throw error;
        }
        showNotification('Article updated successfully!', 'success');
      } else {
        const { data, error } = await createArticle(currentProject.id, title.trim(), content);
        
        if (error) {
          throw error;
        }
        if (data) {
          setCurrentArticleId(data.id);
        }
        showNotification('Article saved successfully!', 'success');
      }
      
      // Reload articles list
      await loadArticles();
    } catch (error) {
      console.error('Save article error:', error);
      showNotification('Failed to save article. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadArticle = (article: Article) => {
    setTitle(article.title);
    setCurrentArticleId(article.id);
    setEditorContent(article.content);
    setShowArticlesList(false);
    showNotification(`Loaded article: ${article.title}`, 'success');
  };

  const handleNewArticle = () => {
    setTitle('');
    setCurrentArticleId(null);
    setEditorContent('');
    setTargetKeyword('');
    setShowArticlesList(false);
    showNotification('Started new article', 'success');
  };

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const handleManageTeam = () => {
    if (currentProject) {
      window.location.hash = `#/team/${currentProject.id}`;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Loading Project...</h2>
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-gray-600">Please wait while we load your project</span>
          </div>
          <button
            onClick={handleBack}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {!isFullscreen && (
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentProject.title}
                </h1>
                <p className="text-sm text-gray-600">
                  Article Editor {!canEdit && '(Read Only)'}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-semibold text-gray-900 truncate max-w-[120px]">
                  {currentProject.title}
                </h1>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-3">
              <button
                onClick={toggleFullscreen}
                className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowArticlesList(true)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Articles</span>
              </button>
              <button
                onClick={handleManageTeam}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Team</span>
              </button>
              <button
                onClick={() => setShowCommentsPanel(true)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments</span>
              </button>
              <button
                onClick={() => setShowBriefPanel(true)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Brief</span>
              </button>
              <button
                onClick={() => setShowSEOPanel(true)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>SEO</span>
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden">
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setShowArticlesList(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Articles</span>
              </button>
              <button
                onClick={() => {
                  handleManageTeam();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Team</span>
              </button>
              <button
                onClick={() => {
                  setShowCommentsPanel(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comments</span>
              </button>
              <button
                onClick={() => {
                  setShowBriefPanel(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Brief</span>
              </button>
              <button
                onClick={() => {
                  setShowSEOPanel(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>SEO</span>
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => {
                      handleGenerateContent();
                      setShowMobileMenu(false);
                    }}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleSave();
                      setShowMobileMenu(false);
                    }}
                    disabled={isSaving}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Usage Indicator */}
        {userProfile && !isFullscreen && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h3 className="font-medium text-blue-900">AI Usage</h3>
                <p className="text-sm text-blue-700">
                  {userProfile.usage_count} of {userProfile.usage_limit} AI generations used this month
                </p>
              </div>
              <div className="w-full sm:w-32 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((userProfile.usage_count / userProfile.usage_limit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* AI Generation Settings */}
        {canEdit && !isFullscreen && (
          <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
            <h3 className="font-medium text-purple-900 mb-4 flex items-center">
              <Wand2 className="w-5 h-5 mr-2" />
              AI Content Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">Target Keyword (Optional)</label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="e.g., digital marketing"
                  className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">Content Length</label>
                <div className="flex space-x-2">
                  {[
                    { value: 'short', label: 'Short', desc: '400-600 words' },
                    { value: 'medium', label: 'Medium', desc: '800-1200 words' },
                    { value: 'long', label: 'Long', desc: '1500-2000 words' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setContentLength(option.value as any)}
                      className={`flex-1 px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                        contentLength === option.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-100'
                      }`}
                      title={option.desc}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your article title..."
              className="w-full text-2xl sm:text-3xl font-bold text-gray-900 placeholder-gray-400 border-none focus:outline-none focus:ring-0 bg-transparent"
              disabled={!canEdit}
            />
            {title && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Title length: {title.length} characters</span>
                {title.length > 60 && (
                  <span className="text-orange-600">⚠️ Consider shortening for SEO</span>
                )}
              </div>
            )}
          </div>
          
          {/* Stats Bar */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <span className="flex items-center">
                  <Type className="w-4 h-4 mr-1" />
                  {wordCount} words
                </span>
                <span className="flex items-center">
                  <Hash className="w-4 h-4 mr-1" />
                  {charCount} characters
                </span>
                {targetKeyword && (
                  <span className="flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    Target: {targetKeyword}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {currentArticleId && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    Saved
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${isFullscreen ? 'h-[calc(100vh-200px)]' : ''}`}>
          <RichTextEditor
            content={editorContent}
            onChange={handleContentChange}
            placeholder="Start writing your article or use AI to generate content..."
            editable={canEdit}
            className={isFullscreen ? 'h-full' : ''}
            isFullscreen={isFullscreen}
            key={currentArticleId || 'new-article'}
          />
        </div>

        {!canEdit && !isFullscreen && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              You have read-only access to this project. Contact the project owner or admin to request edit permissions.
            </p>
          </div>
        )}
      </div>

      {/* Articles List Modal */}
      {showArticlesList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Saved Articles</h2>
              <button
                onClick={() => setShowArticlesList(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4">
                <button
                  onClick={handleNewArticle}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>Start New Article</span>
                </button>
              </div>
              
              {loadingArticles ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No articles saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => handleLoadArticle(article)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-colors"
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                      <p className="text-sm text-gray-600">
                        Last updated: {new Date(article.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEO Panel */}
      <SEOPanel
        isOpen={showSEOPanel}
        onClose={() => setShowSEOPanel(false)}
        title={title}
        content={editorContent}
      />

      {/* Content Brief Panel */}
      <ContentBriefPanel
        isOpen={showBriefPanel}
        onClose={() => setShowBriefPanel(false)}
        title={title}
        onTitleChange={canEdit ? setTitle : () => {}}
        readOnly={!canEdit}
      />

      {/* Comments Panel */}
      {currentArticleId && (
        <CommentsPanel
          isOpen={showCommentsPanel}
          onClose={() => setShowCommentsPanel(false)}
          articleId={currentArticleId}
        />
      )}
    </div>
  );
};

export default ArticleEditor;