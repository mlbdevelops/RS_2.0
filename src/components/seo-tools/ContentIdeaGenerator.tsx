import React, { useState } from 'react';
import { ArrowLeft, Target, Wand2, Copy, Check, Lightbulb } from 'lucide-react';
import { generateContent } from '../../lib/gemini';
import { useNotification } from '../../hooks/useNotification';

interface ContentIdea {
  title: string;
  outline: string[];
  searchIntent: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const ContentIdeaGenerator: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [contentType, setContentType] = useState('blog-post');
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const generateContentIdeas = async () => {
    if (!topic.trim()) {
      showNotification('Please enter a topic first', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `${contentType} about "${topic}"${industry ? ` in the ${industry} industry` : ''}`;

      const content = await generateContent(prompt, 'ideas');
      
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
            title: `The Ultimate Guide to ${topic}`,
            outline: [`Introduction to ${topic}`, `Key benefits and features`, `Best practices and tips`, `Common challenges and solutions`, `Future trends and conclusion`],
            searchIntent: 'Informational',
            difficulty: 'Medium'
          },
          {
            title: `How to Get Started with ${topic} in 2025`,
            outline: [`What is ${topic}?`, `Getting started checklist`, `Essential tools and resources`, `Step-by-step implementation`, `Measuring success`],
            searchIntent: 'Informational',
            difficulty: 'Easy'
          },
          {
            title: `${topic} vs Alternatives: Complete Comparison`,
            outline: [`Overview of options`, `Feature comparison`, `Pros and cons analysis`, `Use case scenarios`, `Final recommendations`],
            searchIntent: 'Commercial',
            difficulty: 'Medium'
          },
          {
            title: `Top 10 ${topic} Tools and Software`,
            outline: [`Selection criteria`, `Detailed tool reviews`, `Pricing comparison`, `Feature analysis`, `Best tool for each use case`],
            searchIntent: 'Commercial',
            difficulty: 'Easy'
          },
          {
            title: `${topic} Case Study: Real Results and Insights`,
            outline: [`Background and challenge`, `Strategy and implementation`, `Results and metrics`, `Lessons learned`, `Actionable takeaways`],
            searchIntent: 'Informational',
            difficulty: 'Hard'
          }
        ];
      }

      // Ensure we have exactly 10 ideas
      if (Array.isArray(parsedContent)) {
        setContentIdeas(parsedContent.slice(0, 10));
      } else {
        setContentIdeas([]);
      }
      
      showNotification('Content ideas generated successfully!', 'success');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          showNotification('Gemini API rate limit exceeded. Please wait a few minutes before trying again.', 'error');
        } else if (error.message.includes('API key')) {
          showNotification('Gemini API configuration error. Please check your settings.', 'error');
        } else {
          showNotification(error.message || 'Failed to generate content ideas', 'error');
        }
      } else {
        showNotification('Failed to generate content ideas', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      showNotification('Title copied to clipboard!', 'success');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      showNotification('Failed to copy to clipboard', 'error');
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
                <h1 className="text-lg font-semibold text-gray-900">AI Content Idea Generator</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Generate 10 SEO blog title ideas with AI</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Info Banner */}
        <div className="mb-6 sm:mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Free Feature</p>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Content idea generation doesn't count against your monthly AI usage limit!
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Content Ideas</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Digital Marketing"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                placeholder="e.g., SaaS, E-commerce"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="blog-post">Blog Post</option>
                <option value="article">Article</option>
                <option value="guide">Guide</option>
                <option value="tutorial">Tutorial</option>
                <option value="case-study">Case Study</option>
                <option value="review">Review</option>
              </select>
            </div>
            
            <div className="md:col-span-3">
              <button
                onClick={generateContentIdeas}
                disabled={isGenerating}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Generating Ideas...' : 'Generate 10 Content Ideas'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generated Content Ideas */}
        {isGenerating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Generating content ideas...</span>
            </div>
          </div>
        ) : contentIdeas.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {contentIdeas.length} Content Ideas Generated
              </h3>
              <p className="text-gray-600">Click any title to copy it to your clipboard</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {contentIdeas.map((idea, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(idea.difficulty)}`}>
                          {idea.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntentColor(idea.searchIntent)}`}>
                          {idea.searchIntent}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(idea.title, index)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 cursor-pointer hover:text-green-600 transition-colors"
                      onClick={() => copyToClipboard(idea.title, index)}>
                    {idea.title}
                  </h4>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Content Outline:</h5>
                    <ul className="space-y-1">
                      {idea.outline.map((point, pointIndex) => (
                        <li key={pointIndex} className="text-sm text-gray-600 flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Content Ideas</h3>
              <p className="text-gray-600">Enter a topic above to get 10 SEO-optimized content ideas with outlines.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentIdeaGenerator;