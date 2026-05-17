const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.gif')) return 'image/gif';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain';
}

function serveStaticFile(res, requestPath) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  });
}

async function handleApiRequest(req, res) {
  if (req.url === '/api/restaurants' && req.method === 'GET') {
    db.all('SELECT * FROM restaurants', (err, rows) => {
      sendJson(res, 200, rows || []);
    });
    return true;
  }

  if (req.url === '/api/restaurants' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { name, cuisine, rating } = JSON.parse(body);

      db.run(
          'INSERT INTO restaurants (name, cuisine, rating) VALUES (?, ?, ?)',
          [name, cuisine, rating || 0],
          function () {
            sendJson(res, 201, { id: this.lastID, success: true });
          }
      );
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request' });
    }
    return true;
  }

  if (req.url.match(/^\/api\/menu\/\d+$/) && req.method === 'GET') {
    const restaurantId = req.url.split('/')[3];
    db.all('SELECT * FROM menu_items WHERE restaurant_id = ?', [restaurantId], (err, rows) => {
      sendJson(res, 200, rows || []);
    });
    return true;
  }

  if (req.url === '/api/menu' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { restaurantId, name, description, price, category, imageUrl } = JSON.parse(body);

      db.run(
          'INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
          [restaurantId, name, description, price, category || 'Main Dish', imageUrl || null],
          function (err) {
            if (err) {
              sendJson(res, 500, { error: 'Database error' });
              return;
            }

            sendJson(res, 201, { id: this.lastID, success: true });
          }
      );
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request' });
    }
    return true;
  }

  if (req.url === '/api/orders' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { customerName, restaurantId, items, totalPrice } = JSON.parse(body);

      db.run(
          'INSERT INTO orders (customer_name, restaurant_id, items, total_price) VALUES (?, ?, ?, ?)',
          [customerName, restaurantId, JSON.stringify(items), totalPrice],
          function () {
            sendJson(res, 201, { id: this.lastID, success: true });
          }
      );
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request' });
    }
    return true;
  }

  if (req.url === '/api/orders' && req.method === 'GET') {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
      sendJson(res, 200, rows || []);
    });
    return true;
  }

  if (req.url.match(/^\/api\/orders\/\d+$/) && req.method === 'PUT') {
    try {
      const body = await readRequestBody(req);
      const orderId = req.url.split('/')[3];
      const { status } = JSON.parse(body);

      db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function () {
        sendJson(res, 200, { success: true });
      });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request' });
    }
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  handleApiRequest(req, res).then((handled) => {
    if (!handled) {
      serveStaticFile(res, req.url);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
