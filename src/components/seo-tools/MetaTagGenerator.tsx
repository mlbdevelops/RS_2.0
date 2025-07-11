import React, { useState } from 'react';
import { ArrowLeft, Search, Wand2, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { generateContent } from '../../lib/gemini';
import { useNotification } from '../../hooks/useNotification';

interface MetaTags {
  title: string;
  description: string;
  keywords: string[];
}

const MetaTagGenerator: React.FC = () => {
  const { userProfile, incrementUsage } = useAuthStore();
  const { showNotification } = useNotification();
  
  const [topic, setTopic] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [metaTags, setMetaTags] = useState<MetaTags | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const generateMetaTags = async () => {
    if (!topic.trim()) {
      showNotification('Please enter a topic first', 'error');
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
      const prompt = `${businessType || 'website'} about "${topic}"${targetKeyword ? ` targeting the keyword "${targetKeyword}"` : ''}`;

      const content = await generateContent(prompt, 'meta');
      
      // Try to parse JSON from the response
      let parsedContent;
      try {
        // Extract JSON from the response if it's wrapped in other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch (parseError) {
        // Fallback: create structured data from the text response
        parsedContent = {
          title: `${topic} - Complete Guide & Best Practices`,
          description: `Discover everything about ${topic}. Expert insights, tips, and strategies to help you succeed. Get started today!`,
          keywords: [topic.toLowerCase(), `${topic} guide`, `${topic} tips`, `${topic} strategy`, `best ${topic}`]
        };
      }

      setMetaTags(parsedContent);
      
      // Increment usage count
      await incrementUsage();
      
      showNotification('Meta tags generated successfully!', 'success');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          showNotification('Gemini API rate limit exceeded. Please wait a few minutes before trying again.', 'error');
        } else if (error.message.includes('API key')) {
          showNotification('Gemini API configuration error. Please check your settings.', 'error');
        } else {
          showNotification(error.message || 'Failed to generate meta tags', 'error');
        }
      } else {
        showNotification('Failed to generate meta tags', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showNotification('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const generateHTMLCode = () => {
    if (!metaTags) return '';
    
    return `<title>${metaTags.title}</title>
<meta name="description" content="${metaTags.description}">
<meta name="keywords" content="${metaTags.keywords.join(', ')}">`;
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
                <h1 className="text-lg font-semibold text-gray-900">Meta Tag Generator</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Generate SEO-optimized meta tags with AI</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Meta Tags</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic or Page Content *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Digital Marketing Strategies for Small Business"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Keyword (Optional)
              </label>
              <input
                type="text"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="e.g., digital marketing"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type (Optional)
              </label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g., SaaS, E-commerce, Blog"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <button
                onClick={generateMetaTags}
                disabled={isGenerating || !userProfile || userProfile.usage_count >= userProfile.usage_limit}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate Meta Tags'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generated Meta Tags */}
        {isGenerating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating your meta tags...</span>
            </div>
          </div>
        ) : metaTags ? (
          <div className="space-y-6">
            {/* Meta Title */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Meta Title</h3>
                <button
                  onClick={() => copyToClipboard(metaTags.title, 'title')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {copiedField === 'title' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 font-medium">{metaTags.title}</p>
                <p className="text-sm text-gray-600 mt-2">Length: {metaTags.title.length} characters</p>
                {metaTags.title.length > 60 && (
                  <p className="text-sm text-orange-600 mt-1">⚠️ Title is longer than recommended 60 characters</p>
                )}
              </div>
            </div>

            {/* Meta Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Meta Description</h3>
                <button
                  onClick={() => copyToClipboard(metaTags.description, 'description')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {copiedField === 'description' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900">{metaTags.description}</p>
                <p className="text-sm text-gray-600 mt-2">Length: {metaTags.description.length} characters</p>
                {metaTags.description.length > 160 && (
                  <p className="text-sm text-orange-600 mt-1">⚠️ Description is longer than recommended 160 characters</p>
                )}
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Keywords</h3>
                <button
                  onClick={() => copyToClipboard(metaTags.keywords.join(', '), 'keywords')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {copiedField === 'keywords' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {metaTags.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* HTML Code */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">HTML Code</h3>
                <button
                  onClick={() => copyToClipboard(generateHTMLCode(), 'html')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {copiedField === 'html' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                <pre className="text-green-400 text-sm">
                  <code>{generateHTMLCode()}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            {!hasGenerated ? (
              <div className="text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Your Meta Tags</h3>
                <p className="text-gray-600">Enter your topic above to get AI-generated, SEO-optimized meta tags.</p>
              </div>
            ) : (
              <div className="text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h3>
                <p className="text-gray-600">Click the generate button above to create your meta tags.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaTagGenerator;