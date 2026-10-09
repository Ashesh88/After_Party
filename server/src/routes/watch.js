const express = require('express');
const https = require('https');
const http = require('http');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/watch/proxy?url=targetUrl
// Strips X-Frame-Options and Content-Security-Policy so streaming embeds work in iframes
router.get('/proxy', (req, res) => {
  const targetUrl = (req.query.url || '').toString().trim();
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid or missing stream URL');
  }

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };

    client.get(targetUrl, options, (upstreamRes) => {
      // Handle HTTP redirects
      if (upstreamRes.statusCode >= 300 && upstreamRes.statusCode < 400 && upstreamRes.headers.location) {
        let redirect = upstreamRes.headers.location;
        if (!redirect.startsWith('http')) {
          redirect = new URL(redirect, targetUrl).href;
        }
        return res.redirect(`/api/watch/proxy?url=${encodeURIComponent(redirect)}`);
      }

      // Strip headers that cause "refuse to connect"
      const headers = { ...upstreamRes.headers };
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      headers['access-control-allow-origin'] = '*';

      res.writeHead(upstreamRes.statusCode || 200, headers);
      upstreamRes.pipe(res);
    }).on('error', (err) => {
      res.status(502).send('Error connecting to streaming server: ' + err.message);
    });
  } catch (err) {
    res.status(500).send('Invalid URL format');
  }
});

// Protect remaining endpoints
router.use(auth);

// Helper to scrape top YouTube search results safely
function searchYouTube(query) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const match = data.match(/var ytInitialData = ({.*?});<\/script>/);
          if (!match) return resolve([]);
          const json = JSON.parse(match[1]);
          const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          const videos = [];

          for (const section of contents) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
              if (item.videoRenderer) {
                const v = item.videoRenderer;
                const id = v.videoId;
                const title = v.title?.runs?.map(r => r.text).join('') || v.title?.simpleText || 'Untitled';
                const thumbnail = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
                const channel = v.ownerText?.runs?.[0]?.text || '';
                const duration = v.lengthText?.simpleText || '';

                if (id) {
                  videos.push({ id, title, thumbnail, channel, duration });
                }
                if (videos.length >= 8) break;
              }
            }
            if (videos.length >= 8) break;
          }
          resolve(videos);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// GET /api/watch/search?q=query
router.get('/search', async (req, res) => {
  const query = (req.query.q || '').toString().trim();
  if (!query) {
    return res.json({ videos: [] });
  }

  try {
    const videos = await searchYouTube(query);
    res.json({ videos });
  } catch (err) {
    console.error('Error in watch search:', err);
    res.status(500).json({ message: 'Search failed', videos: [] });
  }
});

module.exports = router;
