const express = require('express');
const https = require('https');
const auth = require('../middleware/auth');

const router = express.Router();

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
