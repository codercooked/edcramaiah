const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const JSON_FILE = path.join(DATA_DIR, 'registrations.json');
const CSV_FILE = path.join(DATA_DIR, 'registrations.csv');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize CSV header if not exists
if (!fs.existsSync(CSV_FILE)) {
  const csvHeader = 'Timestamp,Serial,Name,Email,Phone,USN,College,Branch,Year,Interests,Vision\n';
  fs.writeFileSync(CSV_FILE, csvHeader, 'utf8');
}

// Initialize JSON file if not exists
if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, '[]', 'utf8');
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function saveRegistration(entry) {
  // 1. Save to JSON
  let entries = [];
  try {
    const raw = fs.readFileSync(JSON_FILE, 'utf8');
    entries = JSON.parse(raw);
    if (!Array.isArray(entries)) entries = [];
  } catch (err) {
    entries = [];
  }
  entries.push(entry);
  fs.writeFileSync(JSON_FILE, JSON.stringify(entries, null, 2), 'utf8');

  // 2. Append to CSV
  const csvRow = [
    escapeCsvField(entry.timestamp || new Date().toISOString()),
    escapeCsvField(entry.serial || ''),
    escapeCsvField(entry.name || ''),
    escapeCsvField(entry.email || ''),
    escapeCsvField(entry.phone || ''),
    escapeCsvField(entry.usn || ''),
    escapeCsvField(entry.college || ''),
    escapeCsvField(entry.branch || ''),
    escapeCsvField(entry.year || ''),
    escapeCsvField(Array.isArray(entry.interests) ? entry.interests.join('; ') : (entry.interests || '')),
    escapeCsvField(entry.vision || '')
  ].join(',') + '\n';

  fs.appendFileSync(CSV_FILE, csvRow, 'utf8');
  return entries.length;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Register Entry (POST)
  if (req.method === 'POST' && pathname === '/api/register') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy(); // 1MB limit protection
      }
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name and email are required.' }));
          return;
        }

        const totalCount = saveRegistration(data);
        console.log(`[REGISTRATION] Logged #${data.serial || totalCount}: ${data.name} (${data.email})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          serial: data.serial,
          count: totalCount,
          message: 'Registration recorded successfully.'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // API: Get all registrations as JSON
  if (req.method === 'GET' && pathname === '/api/registrations') {
    try {
      const data = fs.readFileSync(JSON_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read registrations.' }));
    }
    return;
  }

  // API: Download registrations as CSV
  if (req.method === 'GET' && pathname === '/api/registrations.csv') {
    try {
      const csv = fs.readFileSync(CSV_FILE, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ecell_registrations_2026.csv"'
      });
      res.end(csv);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to download CSV.');
    }
    return;
  }

  // Static File Serving
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[SERVER] E-Cell Server running at http://localhost:${PORT}`);
  console.log(`[STORAGE] CSV saved at: ${CSV_FILE}`);
  console.log(`[STORAGE] JSON saved at: ${JSON_FILE}`);
});
