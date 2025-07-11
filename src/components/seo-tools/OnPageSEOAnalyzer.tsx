import React, { useState } from 'react';
import { ArrowLeft, BarChart3, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface SEOIssue {
  type: 'error' | 'warning' | 'success' | 'info';
  category: string;
  message: string;
  element?: string;
}

interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: string[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
}

const OnPageSEOAnalyzer: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [htmlContent, setHtmlContent] = useState('');
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleBack = () => {
    window.location.hash = '#/dashboard';
  };

  const analyzeHTML = async () => {
    if (!htmlContent.trim()) {
      showNotification('Please paste your HTML content first', 'error');
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const issues: SEOIssue[] = [];
      const recommendations: string[] = [];
      
      // Create a DOM parser to analyze the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Check for title tag
      const titleTag = doc.querySelector('title');
      if (!titleTag) {
        issues.push({
          type: 'error',
          category: 'Title',
          message: 'Missing title tag',
          element: '<title>'
        });
        recommendations.push('Add a title tag to your HTML head section');
      } else {
        const titleLength = titleTag.textContent?.length || 0;
        if (titleLength === 0) {
          issues.push({
            type: 'error',
            category: 'Title',
            message: 'Empty title tag',
            element: '<title>'
          });
        } else if (titleLength < 30) {
          issues.push({
            type: 'warning',
            category: 'Title',
            message: `Title too short (${titleLength} characters). Recommended: 50-60 characters`,
            element: '<title>'
          });
        } else if (titleLength > 60) {
          issues.push({
            type: 'warning',
            category: 'Title',
            message: `Title too long (${titleLength} characters). May be truncated in search results`,
            element: '<title>'
          });
        } else {
          issues.push({
            type: 'success',
            category: 'Title',
            message: `Title length is optimal (${titleLength} characters)`,
            element: '<title>'
          });
        }
      }
      
      // Check for meta description
      const metaDescription = doc.querySelector('meta[name="description"]');
      if (!metaDescription) {
        issues.push({
          type: 'error',
          category: 'Meta Description',
          message: 'Missing meta description',
          element: '<meta name="description">'
        });
        recommendations.push('Add a meta description to improve search result snippets');
      } else {
        const descLength = metaDescription.getAttribute('content')?.length || 0;
        if (descLength === 0) {
          issues.push({
            type: 'error',
            category: 'Meta Description',
            message: 'Empty meta description',
            element: '<meta name="description">'
          });
        } else if (descLength < 120) {
          issues.push({
            type: 'warning',
            category: 'Meta Description',
            message: `Meta description too short (${descLength} characters). Recommended: 150-160 characters`,
            element: '<meta name="description">'
          });
        } else if (descLength > 160) {
          issues.push({
            type: 'warning',
            category: 'Meta Description',
            message: `Meta description too long (${descLength} characters). May be truncated`,
            element: '<meta name="description">'
          });
        } else {
          issues.push({
            type: 'success',
            category: 'Meta Description',
            message: `Meta description length is optimal (${descLength} characters)`,
            element: '<meta name="description">'
          });
        }
      }
      
      // Check for H1 tags
      const h1Tags = doc.querySelectorAll('h1');
      if (h1Tags.length === 0) {
        issues.push({
          type: 'error',
          category: 'Headings',
          message: 'Missing H1 tag',
          element: '<h1>'
        });
        recommendations.push('Add an H1 tag to define the main heading of your page');
      } else if (h1Tags.length > 1) {
        issues.push({
          type: 'warning',
          category: 'Headings',
          message: `Multiple H1 tags found (${h1Tags.length}). Use only one H1 per page`,
          element: '<h1>'
        });
      } else {
        issues.push({
          type: 'success',
          category: 'Headings',
          message: 'Single H1 tag found',
          element: '<h1>'
        });
      }
      
      // Check heading hierarchy
      const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 1) {
        issues.push({
          type: 'success',
          category: 'Headings',
          message: `Good heading structure with ${headings.length} headings`,
          element: 'Headings'
        });
      } else if (headings.length === 1) {
        issues.push({
          type: 'info',
          category: 'Headings',
          message: 'Consider adding more headings (H2, H3) to improve content structure',
          element: 'Headings'
        });
      }
      
      // Check for images without alt text
      const images = doc.querySelectorAll('img');
      const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt'));
      if (imagesWithoutAlt.length > 0) {
        issues.push({
          type: 'error',
          category: 'Images',
          message: `${imagesWithoutAlt.length} image(s) missing alt text`,
          element: '<img>'
        });
        recommendations.push('Add descriptive alt text to all images for accessibility and SEO');
      } else if (images.length > 0) {
        issues.push({
          type: 'success',
          category: 'Images',
          message: `All ${images.length} images have alt text`,
          element: '<img>'
        });
      }
      
      // Check for meta viewport
      const metaViewport = doc.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        issues.push({
          type: 'warning',
          category: 'Mobile',
          message: 'Missing viewport meta tag',
          element: '<meta name="viewport">'
        });
        recommendations.push('Add viewport meta tag for mobile responsiveness');
      } else {
        issues.push({
          type: 'success',
          category: 'Mobile',
          message: 'Viewport meta tag found',
          element: '<meta name="viewport">'
        });
      }
      
      // Check for canonical URL
      const canonical = doc.querySelector('link[rel="canonical"]');
      if (!canonical) {
        issues.push({
          type: 'info',
          category: 'SEO',
          message: 'No canonical URL specified',
          element: '<link rel="canonical">'
        });
        recommendations.push('Consider adding a canonical URL to prevent duplicate content issues');
      } else {
        issues.push({
          type: 'success',
          category: 'SEO',
          message: 'Canonical URL specified',
          element: '<link rel="canonical">'
        });
      }
      
      // Check for Open Graph tags
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const ogDescription = doc.querySelector('meta[property="og:description"]');
      const ogImage = doc.querySelector('meta[property="og:image"]');
      
      if (!ogTitle || !ogDescription || !ogImage) {
        issues.push({
          type: 'warning',
          category: 'Social Media',
          message: 'Missing Open Graph tags for social media sharing',
          element: 'Open Graph'
        });
        recommendations.push('Add Open Graph meta tags to improve social media sharing');
      } else {
        issues.push({
          type: 'success',
          category: 'Social Media',
          message: 'Open Graph tags found',
          element: 'Open Graph'
        });
      }
      
      // Calculate summary
      const summary = {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        passed: issues.filter(i => i.type === 'success').length
      };
      
      // Calculate score
      const totalChecks = issues.length;
      const score = totalChecks > 0 ? Math.round((summary.passed / totalChecks) * 100) : 0;
      
      setAnalysis({
        score,
        issues,
        recommendations,
        summary
      });
      
      setIsAnalyzing(false);
      showNotification('SEO analysis completed!', 'success');
    }, 2000);
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
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
                <h1 className="text-lg font-semibold text-gray-900">On-Page SEO Analyzer</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Analyze HTML for SEO issues and improvements</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Analyze Your HTML</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste your HTML content *
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Paste your HTML content here..."
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            
            <button
              onClick={analyzeHTML}
              disabled={isAnalyzing}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing...' : 'Analyze SEO'}</span>
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        {isAnalyzing ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-3 text-gray-600">Analyzing your HTML for SEO issues...</span>
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* SEO Score */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${
                  analysis.score >= 80 ? 'bg-green-100 text-green-600' :
                  analysis.score >= 60 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {analysis.score}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">SEO Score</h3>
                <p className="text-gray-600">
                  {analysis.score >= 80 ? 'Excellent' :
                   analysis.score >= 60 ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-red-600">{analysis.summary.errors}</div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <AlertTriangle className="w-8 h-8 text-yellow-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{analysis.summary.warnings}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">{analysis.summary.passed}</div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Issues List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h3>
              <div className="space-y-3">
                {analysis.issues.map((issue, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getIssueColor(issue.type)}`}>
                    <div className="flex items-start space-x-3">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{issue.category}</span>
                          {issue.element && (
                            <code className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {issue.element}
                            </code>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm">{issue.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
                <ul className="space-y-2">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analyze Your HTML</h3>
              <p className="text-gray-600">Paste your HTML content above to get a comprehensive SEO analysis with actionable recommendations.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnPageSEOAnalyzer;