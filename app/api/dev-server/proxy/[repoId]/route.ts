import { NextRequest, NextResponse } from 'next/server';
import { getDevServerInfo } from '@/lib/dev-server-manager';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ repoId: string }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params.repoId, '/');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ repoId: string }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params.repoId, '/');
}

async function handleProxyRequest(
  request: NextRequest,
  repoId: string,
  path: string
) {
  if (!repoId) {
    return NextResponse.json(
      { error: 'repoId is required' },
      { status: 400 }
    );
  }
  
  const serverInfo = await getDevServerInfo(repoId);
  
  if (!serverInfo) {
    return NextResponse.json(
      { error: 'Dev server not running. Start it first.' },
      { status: 404 }
    );
  }

  const targetUrl = `http://localhost:${serverInfo.port}${path}`;

  try {
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    const method = request.method;
    const body = method !== 'GET' && method !== 'HEAD' 
      ? await request.text() 
      : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    const responseBody = await response.text();
    
    // For HTML responses, rewrite asset URLs to go through proxy
    const contentType = response.headers.get('content-type') || '';
    let finalBody = responseBody;
    
    if (contentType.includes('text/html')) {
      const proxyBase = `/api/dev-server/proxy/${repoId}`;
      
      // Add base tag first to handle relative URLs
      if (!responseBody.includes('<base')) {
        finalBody = responseBody.replace(
          /<head([^>]*)>/i, 
          `<head$1><base href="${proxyBase}/">`
        );
      }
      
      // Rewrite all absolute paths starting with /_next, /static, /assets, etc.
      // This handles src, href, and action attributes
      finalBody = finalBody.replace(
        /(src|href|action)=["'](\/(?:_next|static|assets|favicon\.ico|logo\.svg)[^"']*)["']/gi,
        (match, attr, url) => {
          // Skip if already proxied
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `${attr}="${proxyBase}${url}"`;
        }
      );
      
      // Rewrite in script tags (handles both src and inline scripts with URLs)
      finalBody = finalBody.replace(
        /<script([^>]*src=["'])(\/(?:_next|static|assets)[^"']*)(["'][^>]*)>/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `<script${prefix}${proxyBase}${url}${suffix}>`;
        }
      );
      
      // Rewrite in link tags
      finalBody = finalBody.replace(
        /<link([^>]*href=["'])(\/(?:_next|static|assets|favicon\.ico|logo\.svg)[^"']*)(["'][^>]*)>/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `<link${prefix}${proxyBase}${url}${suffix}>`;
        }
      );
      
      // Also rewrite in __NEXT_DATA__ script tag (Next.js internal data)
      finalBody = finalBody.replace(
        /"(\/(?:_next|static|assets)[^"']*)"/g,
        (match, url) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          // Only rewrite if it's in a context that makes sense (not breaking JSON)
          // This is tricky - we need to be careful not to break JSON
          // For now, let the base tag handle it
          return match;
        }
      );
    }
    
    const proxiedResponse = new NextResponse(finalBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers
    response.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== 'content-encoding' &&
        key.toLowerCase() !== 'transfer-encoding' &&
        key.toLowerCase() !== 'content-length'
      ) {
        proxiedResponse.headers.set(key, value);
      }
    });

    if (!proxiedResponse.headers.get('content-type')) {
      proxiedResponse.headers.set('content-type', response.headers.get('content-type') || 'text/html');
    }

    return proxiedResponse;
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: `Failed to connect to dev server on port ${serverInfo.port}. The dev server may have stopped.`,
          suggestion: 'Try restarting the dev server.'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to proxy request: ${error.message}` },
      { status: 500 }
    );
  }
}
