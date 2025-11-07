import { NextRequest, NextResponse } from 'next/server';
import { getDevServerInfo } from '@/lib/dev-server-manager';

export async function GET(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request);
}

async function handleProxyRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get('repoId');
  let path = searchParams.get('path') || '/';
  
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
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

  // Build the target URL
  const targetUrl = `http://localhost:${serverInfo.port}${path}`;

  try {
    // Fetch from the dev server
    const headers: HeadersInit = {};
    request.headers.forEach((value, key) => {
      // Skip host header
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    const method = request.method;
    const body = method !== 'GET' && method !== 'HEAD' 
      ? await request.text() 
      : undefined;

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();
    
    // Create new response with proxied content
    const proxiedResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers
    response.headers.forEach((value, key) => {
      // Skip problematic headers
      if (
        key.toLowerCase() !== 'content-encoding' &&
        key.toLowerCase() !== 'transfer-encoding' &&
        key.toLowerCase() !== 'content-length'
      ) {
        proxiedResponse.headers.set(key, value);
      }
    });

    // Set content type if not set
    if (!proxiedResponse.headers.get('content-type')) {
      proxiedResponse.headers.set('content-type', response.headers.get('content-type') || 'text/html');
    }

    return proxiedResponse;
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to proxy request: ${error.message}` },
      { status: 500 }
    );
  }
}

