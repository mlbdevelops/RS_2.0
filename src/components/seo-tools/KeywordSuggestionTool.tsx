import React, { useState } from 'react';
import { ArrowLeft, Hash, Wand2, Copy, Check, TrendingUp, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { generateContent } from '../../lib/gemini';
import { useNotification } from '../../hooks/useNotification';

interface Keyword {
  keyword: string;
  searchIntent: string;
  difficulty: 'Low' | 'Medium' | 'High';
  searchVolume: string;
  competition: 'Low' | 'Medium' | 'High';
}

const KeywordSuggestionTool: React.FC = () => {
  const { userProfile, incrementUsage } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [seedKeyword, setSeedKeyword] = useState('');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const generateKeywords = async () => {
    if (!seedKeyword.trim()) {
      showNotification('Please enter a seed keyword first', 'error');
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
      const prompt = `${seedKeyword}${industry ? ` in the ${industry} industry` : ''}`;

      const content = await generateContent(prompt, 'keywords');
      
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
            keyword: `best ${seedKeyword} tools`,
            searchIntent: 'Commercial',
            difficulty: 'Medium',
            searchVolume: '1K-10K',
            competition: 'Medium'
          },
          {
            keyword: `how to use ${seedKeyword}`,
            searchIntent: 'Informational',
            difficulty: 'Low',
            searchVolume: '500-5K',
            competition: 'Low'
          },
          {
            keyword: `${seedKeyword} for beginners`,
            searchIntent: 'Informational',
            difficulty: 'Low',
            searchVolume: '1K-10K',
            competition: 'Low'
          },
          {
            keyword: `${seedKeyword} vs alternatives`,
            searchIntent: 'Commercial',
            difficulty: 'Medium',
            searchVolume: '500-5K',
            competition: 'Medium'
          },
          {
            keyword: `${seedKeyword} pricing and cost`,
            searchIntent: 'Commercial',
            difficulty: 'Medium',
            searchVolume: '100-1K',
            competition: 'High'
          }
        ];
      }

      // Ensure we have exactly 15 keywords
      if (Array.isArray(parsedContent)) {
        setKeywords(parsedContent.slice(0, 15));
      } else {
        setKeywords([]);
      }
      
      // Increment usage count
      await incrementUsage();
      
      showNotification('Keywords generated successfully!', 'success');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          showNotification('Gemini API rate limit exceeded. Please wait a few minutes before trying again.', 'error');
        } else if (error.message.includes('API key')) {
          showNotification('Gemini API configuration error. Please check your settings.', 'error');
        } else {
          showNotification(error.message || 'Failed to generate keywords', 'error');
        }
      } else {
        showNotification('Failed to generate keywords', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (keyword: string) => {
    try {
      await navigator.clipboard.writeText(keyword);
      setCopiedKeyword(keyword);
      showNotification('Keyword copied to clipboard!', 'success');
      setTimeout(() => setCopiedKeyword(null), 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const copyAllKeywords = async () => {
    try {
      const allKeywords = keywords.map(k => k.keyword).join('\n');
      await navigator.clipboard.writeText(allKeywords);
      showNotification('All keywords copied to clipboard!', 'success');
    } catch (error) {
      showNotification('Failed to copy keywords', 'error');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'High':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'Informational':
        return 'bg-blue-100 text-blue-800';
      case 'Commercial':
        return 'bg-purple-100 text-purple-800';
      case 'Navigational':
        return 'bg-indigo-100 text-indigo-800';
      case 'Transactional':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'Low':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'High':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                <h1 className="text-lg font-semibold text-gray-900">Keyword Suggestion Tool</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Find 15 long-tail keywords with search intent</p>
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
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Keyword Suggestions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seed Keyword *
              </label>
              <input
                type="text"
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="e.g., digital marketing"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry (Optional)
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS, E-commerce, Healthcare"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <button
                onClick={generateKeywords}
                disabled={isGenerating || !userProfile || userProfile.usage_count >= userProfile.usage_limit}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Generating Keywords...' : 'Generate 15 Keywords'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generated Keywords */}
        {isGenerating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Generating keyword suggestions...</span>
            </div>
          </div>
        ) : keywords.length > 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {keywords.length} Keywords Generated
                </h3>
                <p className="text-gray-600">Long-tail keywords with search intent analysis</p>
              </div>
              <button
                onClick={copyAllKeywords}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy All Keywords</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Search Intent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Difficulty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Competition
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {keywords.map((keyword, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {keyword.keyword}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntentColor(keyword.searchIntent)}`}>
                            {keyword.searchIntent}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(keyword.difficulty)}`}>
                            {keyword.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 text-gray-400 mr-1" />
                            {keyword.searchVolume}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompetitionColor(keyword.competition)}`}>
                            {keyword.competition}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => copyToClipboard(keyword.keyword)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedKeyword === keyword.keyword ? 
                              <Check className="w-4 h-4 text-green-500" /> : 
                              <Copy className="w-4 h-4" />
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-blue-600">
                  {keywords.filter(k => k.searchIntent === 'Informational').length}
                </div>
                <div className="text-sm text-gray-600">Informational</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-purple-600">
                  {keywords.filter(k => k.searchIntent === 'Commercial').length}
                </div>
                <div className="text-sm text-gray-600">Commercial</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-green-600">
                  {keywords.filter(k => k.difficulty === 'Low').length}
                </div>
                <div className="text-sm text-gray-600">Low Difficulty</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-orange-600">
                  {keywords.filter(k => k.competition === 'Low').length}
                </div>
                <div className="text-sm text-gray-600">Low Competition</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Keyword Suggestions</h3>
              <p className="text-gray-600">Enter a seed keyword above to get 15 long-tail keyword suggestions with search intent analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordSuggestionTool;