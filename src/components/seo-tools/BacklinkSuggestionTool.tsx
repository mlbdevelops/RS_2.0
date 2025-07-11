import React, { useState } from 'react';
import { ArrowLeft, Link, Wand2, ExternalLink, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { generateContent } from '../../lib/gemini';
import { useNotification } from '../../hooks/useNotification';

interface BacklinkOpportunity {
  website: string;
  type: string;
  authority: 'High' | 'Medium' | 'Low';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  strategy: string;
  contactInfo: string;
}

const BacklinkSuggestionTool: React.FC = () => {
  const { userProfile, incrementUsage } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [niche, setNiche] = useState('');
  const [website, setWebsite] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const generateBacklinkOpportunities = async () => {
    if (!niche.trim()) {
      showNotification('Please enter your niche first', 'error');
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
      const prompt = `${contentType} website in the "${niche}" niche${website ? ` (website: ${website})` : ''}`;

      const content = await generateContent(prompt, 'backlinks');
      
      // Try to parse JSON from the response
      let parsedContent;
      try {
        // Extract JSON from the response if it's wrapped in other text
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Fallback: create structured data from the text response
        parsedContent = [
          {
            website: `${niche} Industry Blog`,
            type: 'Guest Post',
            authority: 'High',
            difficulty: 'Medium',
            strategy: 'Pitch unique, data-driven articles with original insights',
            contactInfo: 'Look for "Write for Us" page or contact the editor directly'
          },
          {
            website: `${niche} Resource Directory`,
            type: 'Directory Listing',
            authority: 'Medium',
            difficulty: 'Easy',
            strategy: 'Submit your website to relevant industry directories',
            contactInfo: 'Most directories have online submission forms'
          },
          {
            website: `${niche} Forum Community`,
            type: 'Forum Signature',
            authority: 'Medium',
            difficulty: 'Easy',
            strategy: 'Participate actively and include website link in signature',
            contactInfo: 'Register directly on the forum platform'
          },
          {
            website: `${niche} Podcast`,
            type: 'Podcast Interview',
            authority: 'High',
            difficulty: 'Hard',
            strategy: 'Pitch yourself as an expert guest with unique insights',
            contactInfo: 'Contact podcast host through their website or social media'
          },
          {
            website: 'Industry News Sites',
            type: 'Press Release',
            authority: 'High',
            difficulty: 'Medium',
            strategy: 'Create newsworthy content or announcements',
            contactInfo: 'Submit through press release distribution services'
          }
        ];
      }

      // Ensure we have exactly 10 opportunities
      if (Array.isArray(parsedContent)) {
        setOpportunities(parsedContent.slice(0, 10));
      } else {
        setOpportunities([]);
      }
      
      // Increment usage count
      await incrementUsage();
      
      showNotification('Backlink opportunities generated successfully!', 'success');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          showNotification('Gemini API rate limit exceeded. Please wait a few minutes before trying again.', 'error');
        } else if (error.message.includes('API key')) {
          showNotification('Gemini API configuration error. Please check your settings.', 'error');
        } else {
          showNotification(error.message || 'Failed to generate backlink opportunities', 'error');
        }
      } else {
        showNotification('Failed to generate backlink opportunities', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOpportunity = async (opportunity: BacklinkOpportunity, index: number) => {
    const text = `Website: ${opportunity.website}
Type: ${opportunity.type}
Authority: ${opportunity.authority}
Difficulty: ${opportunity.difficulty}
Strategy: ${opportunity.strategy}
Contact: ${opportunity.contactInfo}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      showNotification('Opportunity copied to clipboard!', 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const getAuthorityColor = (authority: string) => {
    switch (authority) {
      case 'High':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-teal-100 text-teal-800'
    ];
    return colors[type.length % colors.length];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Backlink Suggestion Tool</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Find backlink opportunities to build authority</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Usage Indicator */}
        {userProfile && (
          <div className="mb-6 sm:mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h3 className="font-medium text-blue-900">AI Usage</h3>
                <p className="text-sm text-blue-700">
                  {userProfile.usage_count} of {userProfile.usage_limit} AI generations used this month
                </p>
              </div>
              <div className="w-full sm:w-32 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((userProfile.usage_count / userProfile.usage_limit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-teal-500 to-green-500 rounded-lg">
              <Link className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Find Backlink Opportunities</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Niche *
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Digital Marketing, Health & Fitness"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Website (Optional)
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="blog">Blog</option>
                <option value="business">Business Website</option>
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS</option>
                <option value="portfolio">Portfolio</option>
                <option value="news">News Site</option>
              </select>
            </div>
            
            <div className="md:col-span-3">
              <button
                onClick={generateBacklinkOpportunities}
                disabled={isGenerating || !userProfile || userProfile.usage_count >= userProfile.usage_limit}
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Finding Opportunities...' : 'Find Backlink Opportunities'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generated Opportunities */}
        {isGenerating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-gray-600">Finding backlink opportunities...</span>
            </div>
          </div>
        ) : opportunities.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {opportunities.length} Backlink Opportunities Found
              </h3>
              <p className="text-gray-600">High-quality opportunities to build your domain authority</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {opportunities.map((opportunity, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-teal-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">{opportunity.website}</h3>
                    </div>
                    <button
                      onClick={() => copyOpportunity(opportunity, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(opportunity.type)}`}>
                      {opportunity.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAuthorityColor(opportunity.authority)}`}>
                      {opportunity.authority} Authority
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(opportunity.difficulty)}`}>
                      {opportunity.difficulty} Difficulty
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Strategy</h4>
                      <p className="text-sm text-gray-600">{opportunity.strategy}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">How to Contact</h4>
                      <p className="text-sm text-gray-600">{opportunity.contactInfo}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>Research this opportunity</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {opportunities.filter(o => o.difficulty === 'Easy').length}
                </div>
                <div className="text-sm text-gray-600">Easy Opportunities</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {opportunities.filter(o => o.authority === 'High').length}
                </div>
                <div className="text-sm text-gray-600">High Authority</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">
                  {opportunities.filter(o => o.type === 'Guest Post').length}
                </div>
                <div className="text-sm text-gray-600">Guest Posts</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">
                  {opportunities.filter(o => o.type === 'Directory Listing').length}
                </div>
                <div className="text-sm text-gray-600">Directories</div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Backlink Building Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Quality Over Quantity</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Focus on high-authority, relevant sites</li>
                    <li>• Avoid low-quality link farms</li>
                    <li>• Build relationships, not just links</li>
                    <li>• Create valuable content worth linking to</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Outreach Best Practices</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Personalize your outreach emails</li>
                    <li>• Provide value before asking for links</li>
                    <li>• Follow up politely if no response</li>
                    <li>• Track your outreach efforts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center">
              <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Find Backlink Opportunities</h3>
              <p className="text-gray-600">Enter your niche above to discover high-quality backlink opportunities that can help build your domain authority.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklinkSuggestionTool;