/**
 * Google Gemini API integration for content generation
 */

const GEMINI_API_KEY = 'AIzaSyBBFyqGFV-WGgUZim9crNCESPzFe-jIQSs';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export async function generateContent(prompt: string, type: 'article' | 'brief' | 'meta' | 'keywords' | 'backlinks' | 'ideas'): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not found, using placeholder content');
    return getPlaceholderContent(prompt, type);
  }

  try {
    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'article':
        systemPrompt = `You are an expert content writer and SEO specialist. Create a comprehensive, well-structured article about the given topic. Use HTML formatting with proper headings (h2, h3), paragraphs, lists, and other elements. Make the content engaging, informative, and SEO-friendly. Aim for the specified word count. Include relevant keywords naturally throughout the content.`;
        userPrompt = `Write a comprehensive, SEO-optimized article about: ${prompt}. Include proper HTML structure with headings, paragraphs, and lists. Make it engaging and informative.`;
        break;
      
      case 'brief':
        systemPrompt = `You are a content strategist. Create a detailed content brief for the given topic. Include target audience, key points to cover, suggested outline, tone recommendations, and SEO considerations.`;
        userPrompt = `Create a detailed content brief for: ${prompt}. Include target audience, outline, key points, tone, and SEO recommendations.`;
        break;
      
      case 'meta':
        systemPrompt = `You are an SEO expert. Generate SEO-optimized meta tags including title, description, and keywords. The title should be 50-60 characters, description 150-160 characters. Return as JSON format with proper escaping.`;
        userPrompt = `Generate SEO meta tags for: ${prompt}. Return as valid JSON with "title", "description", and "keywords" array.`;
        break;
      
      case 'keywords':
        systemPrompt = `You are an SEO keyword researcher. Generate 15 long-tail keyword suggestions with search intent, difficulty, volume estimates, and competition levels. Return as valid JSON array with proper structure.`;
        userPrompt = `Generate 15 long-tail keyword suggestions for: ${prompt}. Return as JSON array with objects containing keyword, searchIntent, difficulty, searchVolume, and competition fields.`;
        break;
      
      case 'backlinks':
        systemPrompt = `You are a link building expert. Generate 10 backlink opportunities including website types, strategies, authority levels, and contact methods. Return as valid JSON array.`;
        userPrompt = `Generate 10 backlink opportunities for: ${prompt}. Return as JSON array with objects containing website, type, authority, difficulty, strategy, and contactInfo fields.`;
        break;
      
      case 'ideas':
        systemPrompt = `You are a content strategist. Generate 10 SEO-optimized content title ideas with outlines, search intent, and difficulty levels. Return as valid JSON array.`;
        userPrompt = `Generate 10 content title ideas for: ${prompt}. Return as JSON array with objects containing title, outline (array), searchIntent, and difficulty fields.`;
        break;
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n${userPrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        stopSequences: []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Add retry logic with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Add delay before each attempt to prevent rate limiting
        if (attempt > 1) {
          const delay = Math.min(Math.pow(2, attempt - 1) * 2000, 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {
            // Use the default error message if JSON parsing fails
          }

          if (response.status === 429) {
            if (attempt < 3) {
              const delay = Math.min(Math.pow(2, attempt) * 3000, 15000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new Error('Gemini API rate limit exceeded. Please wait a few minutes before trying again.');
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid Gemini API key. Please check your configuration.');
          }
          if (response.status === 503 || response.status === 502 || response.status === 504) {
            if (attempt < 3) {
              const delay = Math.min(Math.pow(2, attempt) * 4000, 20000); // Increased delay for 503 errors
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new Error('Gemini API is temporarily overloaded. Please wait a moment and try again.');
          }
          if (response.status >= 500) {
            if (attempt < 3) {
              const delay = Math.min(Math.pow(2, attempt) * 2000, 10000);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(`Gemini API server error (${response.status}). Please try again later.`);
          }
          
          throw new Error(errorMessage);
        }

        const data: GeminiResponse = await response.json();
        
        // Check for API-level errors
        if (data.error) {
          throw new Error(`Gemini API Error: ${data.error.message}`);
        }

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
          throw new Error('No content generated from Gemini API');
        }

        return content.trim();
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain errors
        if (error instanceof Error && (
          error.message.includes('API key') ||
          error.message.includes('Invalid')
        )) {
          throw error;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === 3) {
          // For 503 errors, provide a more helpful message
          if (error instanceof Error && error.message.includes('503')) {
            throw new Error('Gemini API is experiencing high traffic. Please wait 30 seconds and try again.');
          }
          throw error;
        }
      }
    }

    throw lastError;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    
    // Re-throw specific errors that should be shown to the user
    if (error instanceof Error && (
      error.message.includes('rate limit') || 
      error.message.includes('API key') ||
      error.message.includes('temporarily unavailable') ||
      error.message.includes('temporarily overloaded') ||
      error.message.includes('experiencing high traffic') ||
      error.message.includes('server error') ||
      error.name === 'AbortError'
    )) {
      throw error;
    }
    
    // For other errors, provide a more user-friendly message
    throw new Error('AI service is temporarily busy. Please wait a moment and try again.');
  }
}

function getPlaceholderContent(prompt: string, type: 'article' | 'brief' | 'meta' | 'keywords' | 'backlinks' | 'ideas'): string {
  switch (type) {
    case 'article':
      return `
        <h2>Introduction to ${prompt}</h2>
        <p>This comprehensive guide explores the essential aspects of <strong>${prompt}</strong> and provides valuable insights for both beginners and experienced professionals. Understanding this topic is crucial for anyone looking to excel in today's competitive landscape.</p>
        
        <h2>Understanding the Fundamentals</h2>
        <p>To fully grasp the concept of ${prompt}, it's important to understand its core principles and applications. This topic has gained significant attention due to its practical benefits and wide-ranging implications across various industries and use cases.</p>
        
        <h3>Key Components and Elements</h3>
        <ul>
          <li><strong>Foundation:</strong> The basic principles and theoretical framework underlying ${prompt}</li>
          <li><strong>Implementation:</strong> Practical strategies for effectively applying ${prompt} in real-world scenarios</li>
          <li><strong>Optimization:</strong> Advanced techniques and best practices for maximizing results and efficiency</li>
          <li><strong>Measurement:</strong> Methods for tracking success, analyzing performance, and making data-driven improvements</li>
          <li><strong>Innovation:</strong> Emerging trends and future developments in the field of ${prompt}</li>
        </ul>
        
        <h2>Benefits and Strategic Advantages</h2>
        <p>Implementing ${prompt} effectively can provide numerous benefits for individuals and organizations looking to improve their processes, outcomes, and competitive positioning in the market.</p>
        
        <h3>Primary Benefits</h3>
        <ol>
          <li><strong>Enhanced Efficiency:</strong> Streamlined processes that reduce time and resource consumption while improving overall productivity</li>
          <li><strong>Improved Quality:</strong> Higher standards of output and better results that meet or exceed expectations</li>
          <li><strong>Scalability:</strong> The ability to grow and adapt solutions over time as needs and requirements evolve</li>
          <li><strong>Innovation Catalyst:</strong> New opportunities for creative problem-solving and breakthrough solutions</li>
          <li><strong>Competitive Advantage:</strong> Differentiation in the marketplace through superior implementation and results</li>
        </ol>
        
        <h2>Implementation Strategy and Best Practices</h2>
        <p>To successfully implement ${prompt}, it's essential to follow proven strategies and approaches that have been tested and refined by industry leaders and experts in the field.</p>
        
        <h3>Getting Started: A Step-by-Step Approach</h3>
        <p>Begin with a clear understanding of your specific goals, requirements, and constraints. Develop a comprehensive plan that includes realistic timelines, necessary resources, success metrics, and contingency measures to ensure effective implementation.</p>
        
        <h3>Common Challenges and Solutions</h3>
        <p>While implementing ${prompt}, you may encounter various challenges. Here are some common issues and their proven solutions:</p>
        <ul>
          <li><strong>Resource Constraints:</strong> Prioritize high-impact activities and consider phased implementation approaches</li>
          <li><strong>Technical Complexity:</strong> Invest in proper training and consider expert consultation when needed</li>
          <li><strong>Change Management:</strong> Communicate benefits clearly and involve stakeholders in the planning process</li>
          <li><strong>Performance Monitoring:</strong> Establish clear KPIs and regular review processes to track progress</li>
        </ul>
        
        <h2>Advanced Techniques and Optimization</h2>
        <p>Once you have mastered the basics of ${prompt}, you can explore advanced techniques and optimization strategies to further enhance your results and achieve even greater success.</p>
        
        <h3>Performance Enhancement</h3>
        <p>Focus on continuous improvement through regular analysis, feedback collection, and iterative refinement of your approach. Stay updated with the latest developments and best practices in the field.</p>
        
        <h2>Future Trends and Developments</h2>
        <p>The field of ${prompt} continues to evolve rapidly, with new technologies, methodologies, and applications emerging regularly. Staying informed about these trends is crucial for maintaining competitive advantage.</p>
        
        <h2>Conclusion and Next Steps</h2>
        <p>In conclusion, ${prompt} represents a valuable opportunity for growth, improvement, and innovation. By understanding its principles, implementing best practices, and staying adaptable to change, you can achieve significant success and create lasting value.</p>
        
        <p>To get started with your ${prompt} journey, consider taking these immediate next steps:</p>
        <ul>
          <li>Assess your current situation and identify specific areas for improvement</li>
          <li>Develop a clear implementation plan with measurable goals and timelines</li>
          <li>Gather necessary resources and build a supportive team</li>
          <li>Begin with small pilot projects to test and refine your approach</li>
          <li>Monitor progress regularly and adjust your strategy as needed</li>
        </ul>
      `;
    
    case 'meta':
      return JSON.stringify({
        title: `${prompt} - Complete Guide & Best Practices 2025`,
        description: `Discover everything about ${prompt}. Expert insights, proven strategies, and actionable tips to help you succeed. Get started today with our comprehensive guide!`,
        keywords: [
          prompt.toLowerCase(),
          `${prompt} guide`,
          `${prompt} tips`,
          `${prompt} strategy`,
          `best ${prompt}`,
          `${prompt} 2025`,
          `how to ${prompt}`,
          `${prompt} best practices`
        ]
      });
    
    case 'keywords':
      return JSON.stringify([
        {
          keyword: `best ${prompt} tools 2025`,
          searchIntent: 'Commercial',
          difficulty: 'Medium',
          searchVolume: '1K-10K',
          competition: 'Medium'
        },
        {
          keyword: `how to use ${prompt} effectively`,
          searchIntent: 'Informational',
          difficulty: 'Low',
          searchVolume: '500-5K',
          competition: 'Low'
        },
        {
          keyword: `${prompt} for beginners guide`,
          searchIntent: 'Informational',
          difficulty: 'Low',
          searchVolume: '1K-10K',
          competition: 'Low'
        },
        {
          keyword: `${prompt} vs alternatives comparison`,
          searchIntent: 'Commercial',
          difficulty: 'Medium',
          searchVolume: '500-5K',
          competition: 'Medium'
        },
        {
          keyword: `${prompt} pricing and cost`,
          searchIntent: 'Commercial',
          difficulty: 'Medium',
          searchVolume: '100-1K',
          competition: 'High'
        },
        {
          keyword: `free ${prompt} resources`,
          searchIntent: 'Informational',
          difficulty: 'Low',
          searchVolume: '500-2K',
          competition: 'Low'
        },
        {
          keyword: `${prompt} case study examples`,
          searchIntent: 'Informational',
          difficulty: 'Medium',
          searchVolume: '200-1K',
          competition: 'Low'
        },
        {
          keyword: `${prompt} implementation strategy`,
          searchIntent: 'Informational',
          difficulty: 'Medium',
          searchVolume: '300-2K',
          competition: 'Medium'
        },
        {
          keyword: `${prompt} best practices checklist`,
          searchIntent: 'Informational',
          difficulty: 'Low',
          searchVolume: '400-3K',
          competition: 'Low'
        },
        {
          keyword: `${prompt} training and certification`,
          searchIntent: 'Commercial',
          difficulty: 'High',
          searchVolume: '200-1K',
          competition: 'High'
        },
        {
          keyword: `${prompt} software solutions`,
          searchIntent: 'Commercial',
          difficulty: 'High',
          searchVolume: '800-5K',
          competition: 'High'
        },
        {
          keyword: `${prompt} trends 2025`,
          searchIntent: 'Informational',
          difficulty: 'Medium',
          searchVolume: '300-2K',
          competition: 'Medium'
        },
        {
          keyword: `${prompt} ROI calculator`,
          searchIntent: 'Commercial',
          difficulty: 'Medium',
          searchVolume: '100-800',
          competition: 'Medium'
        },
        {
          keyword: `${prompt} consultant services`,
          searchIntent: 'Commercial',
          difficulty: 'High',
          searchVolume: '200-1K',
          competition: 'High'
        },
        {
          keyword: `${prompt} success metrics KPIs`,
          searchIntent: 'Informational',
          difficulty: 'Medium',
          searchVolume: '150-1K',
          competition: 'Low'
        }
      ]);
    
    case 'backlinks':
      return JSON.stringify([
        {
          website: `${prompt} Industry Blog`,
          type: 'Guest Post',
          authority: 'High',
          difficulty: 'Medium',
          strategy: 'Pitch unique, data-driven articles with original insights and case studies',
          contactInfo: 'Look for "Write for Us" page or contact the editor directly via email'
        },
        {
          website: `${prompt} Resource Directory`,
          type: 'Directory Listing',
          authority: 'Medium',
          difficulty: 'Easy',
          strategy: 'Submit your website to relevant industry directories and resource lists',
          contactInfo: 'Most directories have online submission forms or contact pages'
        },
        {
          website: `${prompt} Forum Community`,
          type: 'Forum Signature',
          authority: 'Medium',
          difficulty: 'Easy',
          strategy: 'Participate actively in discussions and include website link in signature',
          contactInfo: 'Register directly on the forum platform and engage with the community'
        },
        {
          website: `${prompt} Podcast Network`,
          type: 'Podcast Interview',
          authority: 'High',
          difficulty: 'Hard',
          strategy: 'Pitch yourself as an expert guest with unique insights and valuable content',
          contactInfo: 'Contact podcast hosts through their website, social media, or booking platforms'
        },
        {
          website: 'Industry News Publications',
          type: 'Press Release',
          authority: 'High',
          difficulty: 'Medium',
          strategy: 'Create newsworthy content, announcements, or research findings',
          contactInfo: 'Submit through press release distribution services or contact journalists directly'
        },
        {
          website: `${prompt} Tool Reviews Site`,
          type: 'Product Review',
          authority: 'Medium',
          difficulty: 'Medium',
          strategy: 'Reach out to review sites to feature your product or service',
          contactInfo: 'Contact review site editors or use their product submission forms'
        },
        {
          website: 'University Research Departments',
          type: 'Educational Resource',
          authority: 'High',
          difficulty: 'Hard',
          strategy: 'Provide valuable educational content or sponsor research projects',
          contactInfo: 'Contact department heads or professors in relevant fields'
        },
        {
          website: `${prompt} Conference Websites`,
          type: 'Event Sponsorship',
          authority: 'High',
          difficulty: 'Medium',
          strategy: 'Sponsor events or speak at conferences to get backlinks from event pages',
          contactInfo: 'Contact event organizers through their official websites'
        },
        {
          website: 'Professional Association Sites',
          type: 'Member Directory',
          authority: 'Medium',
          difficulty: 'Easy',
          strategy: 'Join relevant professional associations and get listed in member directories',
          contactInfo: 'Apply for membership through association websites'
        },
        {
          website: `${prompt} YouTube Channels`,
          type: 'Video Collaboration',
          authority: 'Medium',
          difficulty: 'Medium',
          strategy: 'Collaborate with content creators for interviews, tutorials, or reviews',
          contactInfo: 'Reach out to channel owners through YouTube messages or their business email'
        }
      ]);
    
    case 'ideas':
      return JSON.stringify([
        {
          title: `The Ultimate Guide to ${prompt} in 2025`,
          outline: [
            `Introduction to ${prompt}`,
            'Current market landscape and trends',
            'Key benefits and advantages',
            'Step-by-step implementation guide',
            'Best practices and expert tips',
            'Common mistakes to avoid',
            'Tools and resources',
            'Future predictions and conclusion'
          ],
          searchIntent: 'Informational',
          difficulty: 'Medium'
        },
        {
          title: `How to Get Started with ${prompt}: A Beginner's Guide`,
          outline: [
            `What is ${prompt}?`,
            'Why it matters in today\'s market',
            'Getting started checklist',
            'Essential tools and resources',
            'Step-by-step tutorial',
            'Measuring success and ROI',
            'Next steps and advanced techniques'
          ],
          searchIntent: 'Informational',
          difficulty: 'Easy'
        },
        {
          title: `${prompt} vs Alternatives: Complete Comparison 2025`,
          outline: [
            'Overview of available options',
            'Detailed feature comparison',
            'Pros and cons analysis',
            'Pricing and value comparison',
            'Use case scenarios',
            'Expert recommendations',
            'Final verdict and decision guide'
          ],
          searchIntent: 'Commercial',
          difficulty: 'Medium'
        },
        {
          title: `Top 10 ${prompt} Tools and Software Solutions`,
          outline: [
            'Selection criteria and methodology',
            'Detailed reviews of top tools',
            'Feature comparison matrix',
            'Pricing analysis',
            'User experience and interface',
            'Integration capabilities',
            'Best tool for each use case',
            'Final recommendations'
          ],
          searchIntent: 'Commercial',
          difficulty: 'Easy'
        },
        {
          title: `${prompt} Case Study: How [Company] Achieved 300% Growth`,
          outline: [
            'Company background and challenges',
            'Strategy development and planning',
            'Implementation process',
            'Results and key metrics',
            'Lessons learned',
            'Actionable takeaways',
            'How to replicate success'
          ],
          searchIntent: 'Informational',
          difficulty: 'Hard'
        },
        {
          title: `Common ${prompt} Mistakes and How to Avoid Them`,
          outline: [
            'Introduction to common pitfalls',
            'Mistake #1: Poor planning',
            'Mistake #2: Inadequate resources',
            'Mistake #3: Ignoring best practices',
            'Mistake #4: Lack of measurement',
            'Prevention strategies',
            'Recovery and correction methods'
          ],
          searchIntent: 'Informational',
          difficulty: 'Medium'
        },
        {
          title: `${prompt} Trends and Predictions for 2025`,
          outline: [
            'Current state of the industry',
            'Emerging trends and technologies',
            'Market predictions and forecasts',
            'Impact on businesses',
            'Preparation strategies',
            'Expert opinions and insights',
            'Action plan for the future'
          ],
          searchIntent: 'Informational',
          difficulty: 'Medium'
        },
        {
          title: `ROI Calculator: Measuring ${prompt} Success`,
          outline: [
            'Importance of ROI measurement',
            'Key metrics to track',
            'Calculation methodologies',
            'Tools and templates',
            'Real-world examples',
            'Optimization strategies',
            'Reporting and analysis'
          ],
          searchIntent: 'Commercial',
          difficulty: 'Hard'
        },
        {
          title: `${prompt} Best Practices: Expert Tips and Strategies`,
          outline: [
            'Industry best practices overview',
            'Planning and strategy development',
            'Implementation guidelines',
            'Quality assurance methods',
            'Performance optimization',
            'Troubleshooting common issues',
            'Continuous improvement'
          ],
          searchIntent: 'Informational',
          difficulty: 'Medium'
        },
        {
          title: `Free ${prompt} Resources and Templates`,
          outline: [
            'Comprehensive resource directory',
            'Free tools and software',
            'Templates and checklists',
            'Educational materials',
            'Community resources',
            'Expert recommendations',
            'How to maximize free resources'
          ],
          searchIntent: 'Informational',
          difficulty: 'Easy'
        }
      ]);
    
    default:
      return `Generated content for: ${prompt}`;
  }
}