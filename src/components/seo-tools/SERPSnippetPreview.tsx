import React, { useState } from 'react';
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

const SERPSnippetPreview: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [siteName, setSiteName] = useState('');

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const formatUrl = (inputUrl: string) => {
    if (!inputUrl) return '';
    
    // Remove protocol and www
    let formatted = inputUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // Remove trailing slash
    formatted = formatted.replace(/\/$/, '');
    
    return formatted;
  };

  const getTitleLength = () => title.length;
  const getDescriptionLength = () => description.length;
  
  const isTitleOptimal = () => {
    const length = getTitleLength();
    return length >= 30 && length <= 60;
  };
  
  const isDescriptionOptimal = () => {
    const length = getDescriptionLength();
    return length >= 120 && length <= 160;
  };

  const copySnippetData = async () => {
    const snippetData = `Title: ${title}
Description: ${description}
URL: ${url}`;
    
    try {
      await navigator.clipboard.writeText(snippetData);
      showNotification('Snippet data copied to clipboard!', 'success');
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
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
                <h1 className="text-lg font-semibold text-gray-900">SERP Snippet Preview</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Preview how your page appears in Google search results</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Enter Your Page Details</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your page title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={70}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm ${isTitleOptimal() ? 'text-green-600' : getTitleLength() > 60 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {getTitleLength()}/60 characters
                  </span>
                  {!isTitleOptimal() && (
                    <span className="text-xs text-gray-500">
                      Recommended: 30-60 characters
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your meta description"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={170}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm ${isDescriptionOptimal() ? 'text-green-600' : getDescriptionLength() > 160 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {getDescriptionLength()}/160 characters
                  </span>
                  {!isDescriptionOptimal() && (
                    <span className="text-xs text-gray-500">
                      Recommended: 120-160 characters
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page URL *
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name (Optional)
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Your Site Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={copySnippetData}
                disabled={!title || !description || !url}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy Snippet Data
              </button>
            </div>
          </div>

          {/* SERP Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Google Search Preview</h2>
            
            {/* Google Search Bar Mockup */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <div className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2">
                  <span className="text-gray-500 text-sm">your search query</span>
                </div>
              </div>
            </div>

            {/* SERP Result */}
            <div className="border-l-4 border-blue-500 pl-4">
              {/* URL */}
              <div className="flex items-center space-x-2 mb-1">
                {siteName && (
                  <>
                    <span className="text-sm text-gray-600">{siteName}</span>
                    <span className="text-gray-400">›</span>
                  </>
                )}
                <span className="text-sm text-green-700">
                  {formatUrl(url) || 'example.com/page'}
                </span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-2 leading-tight">
                {title || 'Your Page Title Will Appear Here'}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {description || 'Your meta description will appear here. This is what users will see in search results, so make it compelling and informative.'}
              </p>
              
              {/* Additional elements that might appear */}
              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                <span>★★★★☆ 4.2 · 127 reviews</span>
                <span>$$$</span>
              </div>
            </div>

            {/* Mobile Preview Toggle */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Mobile Preview</h4>
              <div className="bg-white border border-gray-300 rounded-lg p-3 max-w-sm">
                <div className="text-xs text-green-700 mb-1">
                  {formatUrl(url) || 'example.com/page'}
                </div>
                <h4 className="text-sm text-blue-600 font-medium mb-1 leading-tight">
                  {title || 'Your Page Title'}
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {description ? description.substring(0, 120) + (description.length > 120 ? '...' : '') : 'Your meta description...'}
                </p>
              </div>
            </div>

            {/* Optimization Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Optimization Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Include your target keyword in the title</li>
                <li>• Make the description compelling and actionable</li>
                <li>• Use proper capitalization and punctuation</li>
                <li>• Avoid keyword stuffing</li>
                <li>• Test different variations to improve CTR</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Character Count Guidelines */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Title Tag Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Keep between 30-60 characters</li>
                <li>• Include primary keyword near the beginning</li>
                <li>• Make it unique and descriptive</li>
                <li>• Avoid keyword stuffing</li>
                <li>• Include brand name if space allows</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Meta Description Best Practices</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Keep between 120-160 characters</li>
                <li>• Include a clear call-to-action</li>
                <li>• Summarize page content accurately</li>
                <li>• Use active voice when possible</li>
                <li>• Include relevant keywords naturally</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SERPSnippetPreview;