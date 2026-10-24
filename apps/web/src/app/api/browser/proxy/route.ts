import { NextRequest, NextResponse } from 'next/server';
import { BrowserWorker } from '@/modules/tolee-ai-agent/browser/browser-worker';
import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * 🌐 Tolee Real Live Browser Secure Proxy
 * Loads real target websites inside the Tolee right-side LiveBrowserOperatorCanvas iframe.
 * 
 * Security:
 * - Validates URL with BrowserWorker.isSafeUrl (SSRF Guard: blocks loopbacks, private IPs, cloud metadata)
 * - Strips X-Frame-Options and Content-Security-Policy to allow embedded sandboxed preview
 * - Injects <base href="..."> so stylesheets, fonts, and assets load from the origin
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // 1. SSRF Safety Check
  const safety = BrowserWorker.isSafeUrl(targetUrl);
  if (!safety.safe) {
    return new NextResponse(`SSRF Security Error: ${safety.reason}`, { status: 403 });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const client = parsedTarget.protocol === 'https:' ? https : http;

    return await new Promise<NextResponse>((resolve) => {
      const proxyReq = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
            'Cache-Control': 'no-cache',
          },
          timeout: 8000,
        },
        (proxyRes) => {
          // Handle redirects (up to 1 hop)
          if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            try {
              const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
              const redirectSafety = BrowserWorker.isSafeUrl(redirectUrl);
              if (redirectSafety.safe) {
                return resolve(NextResponse.redirect(new URL(`/api/browser/proxy?url=${encodeURIComponent(redirectUrl)}`, request.url)));
              }
            } catch {}
          }

          let data = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (chunk) => {
            if (data.length < 500000) { // 500KB cap for preview
              data += chunk;
            }
          });

          proxyRes.on('end', () => {
            const origin = parsedTarget.origin;
            let modifiedHtml = data;

            // Inject base href tag if HTML
            if (proxyRes.headers['content-type']?.includes('text/html') || data.includes('<html')) {
              // Remove existing <base> if any
              modifiedHtml = modifiedHtml.replace(/<base[^>]*>/gi, '');
              // Inject base href after <head> or at start
              const baseTag = `<base href="${origin}/">\n<meta name="referrer" content="no-referrer">\n`;
              if (modifiedHtml.includes('<head>')) {
                modifiedHtml = modifiedHtml.replace('<head>', `<head>\n${baseTag}`);
              } else if (modifiedHtml.includes('<head ')) {
                modifiedHtml = modifiedHtml.replace(/<head[^>]*>/i, `$& \n${baseTag}`);
              } else {
                modifiedHtml = baseTag + modifiedHtml;
              }

              // Strip aggressive framing busters
              modifiedHtml = modifiedHtml.replace(/if\s*\(top\s*!==\s*self\)\s*top\.location\s*=\s*self\.location;?/gi, '');
            }

            const hasBlockKeywords =
              proxyRes.statusCode === 403 ||
              proxyRes.statusCode === 429 ||
              data.includes('Sorry, you have been blocked') ||
              data.includes('Attention Required! | Cloudflare') ||
              data.includes('Why have I been blocked') ||
              data.includes('security service to protect itself') ||
              data.includes('Access Denied');

            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', proxyRes.headers['content-type'] || 'text/html; charset=utf-8');
            responseHeaders.set('Cache-Control', 'no-store, max-age=0');
            responseHeaders.set('x-tolee-browser-blocked', hasBlockKeywords ? 'true' : 'false');
            if (hasBlockKeywords) {
              responseHeaders.set('x-tolee-block-reason', 'WAF_SECURITY_SERVICE_BLOCKED');
            }
            // Remove frame blocking headers
            responseHeaders.delete('x-frame-options');
            responseHeaders.delete('content-security-policy');

            resolve(
              new NextResponse(modifiedHtml, {
                status: proxyRes.statusCode || 200,
                headers: responseHeaders,
              })
            );
          });
        }
      );

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        resolve(new NextResponse(`Gateway Timeout connecting to ${parsedTarget.hostname}`, { status: 504 }));
      });

      proxyReq.on('error', (err) => {
        resolve(new NextResponse(`Error loading ${targetUrl}: ${err.message}`, { status: 502 }));
      });
    });
  } catch (err: any) {
    return new NextResponse(`Proxy Exception: ${err.message}`, { status: 500 });
  }
}
