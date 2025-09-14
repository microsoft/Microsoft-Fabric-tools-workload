/**
 * Generic API Proxy Route for Express.js (JavaScript version)
 * Add this route to your Express development server to proxy external API calls
 * This helps bypass CORS restrictions during development
 */

const express = require('express');
const router = express.Router();

/**
 * Generic proxy route that forwards requests to external APIs
 * ALL /api/proxy - Forwards the request to the URL specified in X-Target-URL header
 * This helps in developement with CORS issues
 */
router.options('/proxy', (req, res) => {
  // Handle CORS preflight requests
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL, X-Target-Base-URL',
    'Access-Control-Max-Age': '86400'
  });
  res.status(204).send();
});

router.all('/proxy', async (req, res) => {

  // Get the target URL from headers
  const targetUrl = req.headers['x-target-url'];
  const targetBaseUrl = req.headers['x-target-base-url'];

  try {

    if (!targetUrl) {
      res.status(400).json({
        error: {
          message: 'Missing X-Target-URL header',
          type: 'ProxyError',
          code: 400
        }
      });
      return;
    }

    // Extract headers to forward (excluding proxy-specific headers)
    const forwardHeaders = {};
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith('x-target-') && 
          lowerKey !== 'host' && 
          lowerKey !== 'connection' && 
          lowerKey !== 'upgrade' &&
          lowerKey !== 'origin' &&
          lowerKey !== 'referer' &&
          lowerKey !== 'user-agent') {
        forwardHeaders[key] = req.headers[key];
      }
    });

    // Add proper origin for the target server
    if (targetBaseUrl) {
      forwardHeaders['Origin'] = targetBaseUrl;
    }

    const proxyOptions = {
      method: req.method,
      headers: forwardHeaders
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      proxyOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    console.log(`[API Proxy] ${req.method} ${targetUrl}`);
    
    // Make the proxied request using native fetch (Node 18+) or require node-fetch
    let fetch;
    try {
      // Try to use native fetch (Node 18+)
      fetch = globalThis.fetch;
      if (!fetch) {
        // Fallback to node-fetch
        fetch = require('node-fetch');
      }
    } catch (error) {
      throw new Error('Fetch is not available. Please use Node.js 18+ or install node-fetch');
    }
    
    const response = await fetch(targetUrl, proxyOptions);
    const responseText = await response.text();
    
    // Forward response headers (excluding problematic ones)
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith('access-control-') && 
          lowerKey !== 'connection' && 
          lowerKey !== 'transfer-encoding' &&
          lowerKey !== 'content-encoding' &&
          lowerKey !== 'server') {
        responseHeaders[key] = value;
      }
    });

    // Add CORS headers to allow the client to access the response
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-URL, X-Target-Base-URL',
      'Access-Control-Expose-Headers': '*',
      ...responseHeaders
    });

    res.status(response.status);
    
    // Try to parse as JSON, otherwise return as text
    try {
      const jsonData = JSON.parse(responseText);
      res.json(jsonData);
    } catch {
      res.send(responseText);
    }

  } catch (error) {
    console.error('[API Proxy] Error:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Proxy request failed',
        type: 'ProxyError',
        code: 500
      }
    });
  }
  finally {
    console.log(`[API Proxy] ${req.method} ${targetUrl} ${res.statusCode}`);
  }
});

module.exports = router;
