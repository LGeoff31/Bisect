import { NextRequest, NextResponse } from 'next/server';
import { getDevServerInfo } from '@/lib/dev-server-manager';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ repoId: string; path?: string[] }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ repoId: string; path?: string[] }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ repoId: string; path?: string[] }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ repoId: string; path?: string[] }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ repoId: string; path?: string[] }> }
) {
  const params = await context.params;
  return handleProxyRequest(request, params);
}

async function handleProxyRequest(
  request: NextRequest,
  params: { repoId: string; path?: string[] }
) {
  const { repoId, path: pathSegments } = params;
  
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

  const path = pathSegments && pathSegments.length > 0 
    ? '/' + pathSegments.join('/')
    : '/';
  
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
      
      // Add base tag to handle relative URLs
      if (!responseBody.includes('<base')) {
        finalBody = responseBody.replace(
          /<head([^>]*)>/i, 
          `<head$1><base href="${proxyBase}/">`
        );
      }
      
      // Rewrite absolute paths in src and href attributes
      finalBody = finalBody.replace(
        /(src|href)=["'](\/(?:_next|static|assets|favicon\.ico|logo\.svg)[^"']*)["']/gi,
        (match, attr, url) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `${attr}="${proxyBase}${url}"`;
        }
      );
      
      // Rewrite in script and link tags
      finalBody = finalBody.replace(
        /<script([^>]*src=["'])(\/(?:_next|static|assets)[^"']*)(["'][^>]*)>/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `<script${prefix}${proxyBase}${url}${suffix}>`;
        }
      );
      
      finalBody = finalBody.replace(
        /<link([^>]*href=["'])(\/(?:_next|static|assets|favicon\.ico|logo\.svg)[^"']*)(["'][^>]*)>/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith('/api/dev-server/proxy')) {
            return match;
          }
          return `<link${prefix}${proxyBase}${url}${suffix}>`;
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
