import https from 'https';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url?: string;
}

/**
 * 🌐 Lightweight Live Internet Search Utility
 * Uses DuckDuckGo HTML zero-key search with strict 2.5s timeout.
 * Returns concise verified web snippets to eliminate knowledge cutoffs and hallucinations.
 */
export async function searchLiveWeb(query: string, maxResults: number = 3): Promise<string> {
  const q = (query || '').trim();
  if (!q) return '';

  return new Promise((resolve) => {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const req = https.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          timeout: 2800, // Strict 2.8s timeout
        },
        (res) => {
          let html = '';
          res.on('data', (chunk) => {
            html += chunk;
            if (html.length > 150000) {
              res.destroy(); // Limit memory footprint
            }
          });
          res.on('end', () => {
            try {
              const regex = new RegExp('<a class="result__snippet[^>]*>([\\s\\S]*?)<\\/a>', 'g');
              const snippets: string[] = [];
              let match: RegExpExecArray | null;
              while ((match = regex.exec(html)) !== null && snippets.length < maxResults) {
                const cleaned = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                if (cleaned && cleaned.length > 15) {
                  snippets.push(cleaned);
                }
              }
              resolve(snippets.join('\n'));
            } catch {
              resolve('');
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });

      req.on('error', () => {
        resolve('');
      });
    } catch {
      resolve('');
    }
  });
}

/**
 * Check if a query requires live web verification (real-time facts, current affairs, rates, weather, sports, recent events)
 */
export function requiresLiveWebSearch(message: string): boolean {
  const lower = (message || '').toLowerCase();
  
  // Real-time / temporal trigger keywords
  const liveKeywords = [
    'who is', 'kon hai', 'kaun hai', 'pm of', 'president of', 'cm of',
    'weather', 'mausam', 'temperature', 'taapman',
    'score', 'ipl', 'match', 'winner', 'who won', 'jeet', 'jeeta',
    'rate', 'price', 'dollar', 'gold', 'petrol', 'diesel', 'stock',
    'today', 'aaj', 'aaj ka', 'current', 'latest', 'hal hi me', 'abhi ka',
    '2024', '2025', '2026', 'news', 'breaking', 'taaza', 'taaza khabar',
    'election', 'chunav', 'narendra modi', 'biden', 'trump'
  ];

  return liveKeywords.some((kw) => lower.includes(kw));
}
