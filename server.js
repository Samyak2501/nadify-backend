const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { index: false }));

const PORT = process.env.PORT || 3001;
const API_PORT = 3002;
const API_URL = `http://localhost:${API_PORT}/api`;

// Programmatic runner for JioSaavn API
let apiProcess = null;

function startJioSaavnAPI() {
  const apiDir = path.join(__dirname, 'jiosaavn-api');
  console.log(`[Server] Starting JioSaavn API server in ${apiDir} on port ${API_PORT}...`);
  
  apiProcess = spawn('npx', ['tsx', 'start-node.ts'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true
  });
  
  apiProcess.on('error', (err) => {
    console.error('[Server] Failed to start JioSaavn API:', err);
  });
  
  process.on('exit', () => {
    if (apiProcess) apiProcess.kill();
  });
}

// Start API server
startJioSaavnAPI();

// Root endpoint status check / UI serving
app.get('/', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.json({ status: 'ok', message: 'Nadify Server Running' });
  }
});

app.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Nadify Server Running' });
});

// ========== TOP SONGS ENDPOINT ==========
app.get('/top-songs', async (req, res) => {
  try {
    const url = "https://kworb.net/spotify/country/in_daily.html";
    console.log(`[Server] Fetching top songs from Spotify India chart: ${url}...`);

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const songNames = [];

    $("table tbody tr").each((i, el) => {
      if (songNames.length >= 25) return false;

      const cols = $(el).find("td");
      if (cols.length < 3) return;

      const titleWithArtist = $(cols[2]).text().trim();

      if (titleWithArtist) {
        songNames.push(titleWithArtist);
      }
    });

    if (songNames.length === 0) {
      return res.json({ status: false, songs: [], error: 'No songs found on Spotify daily chart' });
    }

    console.log(`[Server] Scraped top ${songNames.length} songs from Spotify chart. Resolving details from JioSaavn API...`);

    const songPromises = songNames.map(async (name) => {
      try {
        // Clean query by removing parenthesis (e.g. "(w/ Bharath)") and square brackets and their contents
        const searchQuery = name.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
        console.log(`[Server] Resolving: "${searchQuery}" (scraped: "${name}")`);

        const response = await axios.get(`${API_URL}/search/songs`, {
          params: { query: searchQuery, page: 0, limit: 1 },
          timeout: 8000
        });

        if (response.data && response.data.success && response.data.data && response.data.data.results && response.data.data.results.length > 0) {
          const song = response.data.data.results[0];
          const image = song.image && song.image.length > 0 ? (song.image[song.image.length - 1]?.url || song.image[song.image.length - 1]?.link || '') : '';
          const downloadLink = song.downloadUrl && song.downloadUrl.length > 0 ? (song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[song.downloadUrl.length - 1]?.link || '') : '';
          const artist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown';

          return {
            name: song.name || 'Unknown',
            artist: artist,
            image: image,
            url: song.id, // Play by song ID
            duration: song.duration,
            download_link: downloadLink,
            source: 'jiosaavn'
          };
        }
        return null;
      } catch (e) {
        console.error(`[Server] Failed to resolve top song "${name}" via JioSaavn search:`, e.message);
        return null;
      }
    });

    const resolved = await Promise.all(songPromises);
    const resolvedSongs = resolved.filter(s => s !== null);

    // Slice to first 8 successful resolutions and map ranks sequentially from 1 to 8
    const songs = resolvedSongs.slice(0, 8).map((song, index) => ({
      ...song,
      rank: index + 1
    }));

    res.json({ status: true, songs });
  } catch (err) {
    console.error("[Server] Error fetching top songs:", err.message);
    res.json({ status: false, songs: [], error: err.message });
  }
});

// ========== SEARCH ENDPOINT ==========
app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({ results: [] });
  }

  try {
    console.log(`[Server] Searching songs on JioSaavn for: "${query}"...`);
    const response = await axios.get(`${API_URL}/search/songs`, {
      params: { query: query, page: 0, limit: 15 },
      timeout: 10000
    });

    if (!response.data || !response.data.success || !response.data.data || !response.data.data.results) {
      return res.json({ results: [] });
    }

    const rawSongs = response.data.data.results;
    const results = rawSongs.map((song) => {
      const image = song.image && song.image.length > 0 ? (song.image[song.image.length - 1]?.url || song.image[song.image.length - 1]?.link || '') : '';
      const downloadLink = song.downloadUrl && song.downloadUrl.length > 0 ? (song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[song.downloadUrl.length - 1]?.link || '') : '';
      const artist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown';

      return {
        name: song.name || 'Unknown',
        artist: artist,
        image: image,
        spotify_url: song.id, // Store ID as the playback url key
        duration: song.duration,
        download_link: downloadLink,
        source: 'jiosaavn'
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('[Server] Search error:', error.message);
    res.json({ results: [], error: error.message });
  }
});

// ========== PROXY ENDPOINT (For Web Audio API CORS) ==========
app.get('/proxy', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('No URL provided');

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  // Forward the Range header so seeking works seamlessly
  if (req.headers.range) {
    options.headers['Range'] = req.headers.range;
  }

  https.get(url, options, (proxyRes) => {
    // Forward the headers and append CORS permissions
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept-Ranges, Content-Type, Content-Length',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
    });
    proxyRes.pipe(res);
  }).on('error', (e) => {
    res.status(500).send(e.message);
  });
});

// ========== STREAM ENDPOINT ==========
app.get('/stream', async (req, res) => {
  const url = req.query.url; // Song ID or original URL
  const downloadLink = req.query.download_link;
  const title = req.query.title || 'Unknown';
  const artist = req.query.artist || 'Unknown';
  const image = req.query.image || '';

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  // Case 1: If direct download link is provided (the most common case)
  if (downloadLink) {
    console.log('[Server] Stream: Using direct download link:', downloadLink);
    const proxiedUrl = `${baseUrl}/proxy?url=${encodeURIComponent(downloadLink)}`;
    return res.json({
      status: true,
      stream_url: proxiedUrl,
      title: title,
      artist: artist,
      image: image,
      source: 'jiosaavn'
    });
  }

  // Case 2: If we only have the song ID (passed in url param)
  if (url) {
    try {
      console.log('[Server] Stream: Querying song ID from JioSaavn API:', url);
      const response = await axios.get(`${API_URL}/songs`, {
        params: { ids: url },
        timeout: 10000
      });

      if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
        const song = response.data.data[0];
        const highestQualityUrl = song.downloadUrl && song.downloadUrl.length > 0 ? (song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[song.downloadUrl.length - 1]?.link || '') : '';
        
        if (highestQualityUrl) {
          const proxiedUrl = `${baseUrl}/proxy?url=${encodeURIComponent(highestQualityUrl)}`;
          return res.json({
            status: true,
            stream_url: proxiedUrl,
            title: song.name || title,
            artist: song.artists?.primary?.map(a => a.name).join(', ') || artist,
            image: song.image && song.image.length > 0 ? (song.image[song.image.length - 1]?.url || song.image[song.image.length - 1]?.link || '') : image,
            source: 'jiosaavn'
          });
        }
      }
    } catch (e) {
      console.error('[Server] Stream: Failed to resolve song ID:', url, e.message);
    }
  }

  res.json({ status: false, error: 'No streamable link found for this song' });
});

app.listen(PORT, () => {
  console.log(`✅ Nadify Server running on http://localhost:${PORT}`);
});