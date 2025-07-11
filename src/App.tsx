import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Testimonials from './components/Testimonials';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import Dashboard from './components/dashboard/Dashboard';
import ArticleEditor from './components/editor/ArticleEditor';
import ContentBriefGenerator from './components/content/ContentBriefGenerator';
import TeamCollaboration from './components/team/TeamCollaboration';
import AccountSettings from './components/account/AccountSettings';
import PricingPage from './components/pricing/PricingPage';
import SupportFAQ from './components/support/SupportFAQ';
import AuthModal from './components/auth/AuthModal';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Notification from './components/Notification';

// SEO Tools Pages
import MetaTagGenerator from './components/seo-tools/MetaTagGenerator';
import ContentIdeaGenerator from './components/seo-tools/ContentIdeaGenerator';
import KeywordSuggestionTool from './components/seo-tools/KeywordSuggestionTool';
import OnPageSEOAnalyzer from './components/seo-tools/OnPageSEOAnalyzer';
import SERPSnippetPreview from './components/seo-tools/SERPSnippetPreview';
import BacklinkSuggestionTool from './components/seo-tools/BacklinkSuggestionTool';

function App() {
  const { user, initialized, initialize } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentView, setCurrentView] = useState<string>('landing');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Enhanced hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/dashboard' || hash === '#/' && user) {
        setCurrentView('dashboard');
      } else if (hash.startsWith('#/project/')) {
        setCurrentView('editor');
      } else if (hash.startsWith('#/brief-generator')) {
        setCurrentView('brief-generator');
      } else if (hash.startsWith('#/team')) {
        setCurrentView('team');
      } else if (hash.startsWith('#/settings')) {
        setCurrentView('settings');
      } else if (hash.startsWith('#/pricing')) {
        setCurrentView('pricing');
      } else if (hash.startsWith('#/support')) {
        setCurrentView('support');
      } else if (hash.startsWith('#/seo-tools/meta-generator')) {
        setCurrentView('meta-generator');
      } else if (hash.startsWith('#/seo-tools/content-ideas')) {
        setCurrentView('content-ideas');
      } else if (hash.startsWith('#/seo-tools/keyword-suggestions')) {
        setCurrentView('keyword-suggestions');
      } else if (hash.startsWith('#/seo-tools/seo-analyzer')) {
        setCurrentView('seo-analyzer');
      } else if (hash.startsWith('#/seo-tools/serp-preview')) {
        setCurrentView('serp-preview');
      } else if (hash.startsWith('#/seo-tools/backlink-suggestions')) {
        setCurrentView('backlink-suggestions');
      } else {
        setCurrentView(user ? 'dashboard' : 'landing');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is authenticated, show the appropriate view
  if (user) {
    switch (currentView) {
      case 'editor':
        return (
          <ErrorBoundary>
            <ArticleEditor />
            <Notification />
          </ErrorBoundary>
        );
      case 'brief-generator':
        return (
          <ErrorBoundary>
            <ContentBriefGenerator />
            <Notification />
          </ErrorBoundary>
        );
      case 'team':
        return (
          <ErrorBoundary>
            <TeamCollaboration />
            <Notification />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <ErrorBoundary>
            <AccountSettings />
            <Notification />
          </ErrorBoundary>
        );
      case 'pricing':
        return (
          <ErrorBoundary>
            <PricingPage />
            <Notification />
          </ErrorBoundary>
        );
      case 'support':
        return (
          <ErrorBoundary>
            <SupportFAQ />
            <Notification />
          </ErrorBoundary>
        );
      case 'meta-generator':
        return (
          <ErrorBoundary>
            <MetaTagGenerator />
            <Notification />
          </ErrorBoundary>
        );
      case 'content-ideas':
        return (
          <ErrorBoundary>
            <ContentIdeaGenerator />
            <Notification />
          </ErrorBoundary>
        );
      case 'keyword-suggestions':
        return (
          <ErrorBoundary>
            <KeywordSuggestionTool />
            <Notification />
          </ErrorBoundary>
        );
      case 'seo-analyzer':
        return (
          <ErrorBoundary>
            <OnPageSEOAnalyzer />
            <Notification />
          </ErrorBoundary>
        );
      case 'serp-preview':
        return (
          <ErrorBoundary>
            <SERPSnippetPreview />
            <Notification />
          </ErrorBoundary>
        );
      case 'backlink-suggestions':
        return (
          <ErrorBoundary>
            <BacklinkSuggestionTool />
            <Notification />
          </ErrorBoundary>
        );
      case 'dashboard':
      default:
        return (
          <ErrorBoundary>
            <Dashboard />
            <Notification />
          </ErrorBoundary>
        );
    }
  }

  // Show landing page for non-authenticated users
  if (currentView === 'pricing') {
    return (
      <ErrorBoundary>
        <PricingPage />
        <Notification />
      </ErrorBoundary>
    );
  }

  if (currentView === 'support') {
    return (
      <ErrorBoundary>
        <SupportFAQ />
        <Notification />
      </ErrorBoundary>
    );
  }

  // Show landing page
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Header onAuthClick={handleAuthClick} />
        <Hero onAuthClick={handleAuthClick} />
        <Features />
        <Testimonials />
        <Pricing onAuthClick={handleAuthClick} />
        <Newsletter />
        <Footer />
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
        <Notification />
      </div>
    </ErrorBoundary>
  );
}

export default App;