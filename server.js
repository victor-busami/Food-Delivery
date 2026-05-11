const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.sqlite');
const PORT = 3000;

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to SQLite database');
});

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    rating REAL DEFAULT 4.5
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    restaurant_id INTEGER NOT NULL,
    items TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
  )`);

  // Seed data
  db.get("SELECT COUNT(*) as count FROM restaurants", (err, row) => {
    if (row.count === 0) {
      const restaurants = [
        { name: 'Pizza Palace', cuisine: 'Italian' },
        { name: 'Burger Barn', cuisine: 'American' },
        { name: 'Sushi Studio', cuisine: 'Japanese' }
      ];

      restaurants.forEach((r) => {
        db.run('INSERT INTO restaurants (name, cuisine) VALUES (?, ?)', [r.name, r.cuisine], function(err) {
          if (!err && r.name === 'Pizza Palace') {
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'Margherita', 'Classic cheese pizza', 12.99]);
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'Pepperoni', 'Pepperoni pizza', 14.99]);
          } else if (!err && r.name === 'Burger Barn') {
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'Classic Burger', 'Juicy beef burger', 9.99]);
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'Chicken Burger', 'Crispy chicken burger', 10.99]);
          } else if (!err && r.name === 'Sushi Studio') {
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'California Roll', 'Fresh california roll', 11.99]);
            db.run('INSERT INTO menu_items (restaurant_id, name, description, price) VALUES (?, ?, ?, ?)',
              [this.lastID, 'Spicy Tuna', 'Spicy tuna roll', 13.99]);
          }
        });
      });
    }
  });
});

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve index.html
  if (req.url === '/' && req.method === 'GET') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // API: Get all restaurants
  if (req.url === '/api/restaurants' && req.method === 'GET') {
    db.all('SELECT * FROM restaurants', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows || []));
    });
    return;
  }

  // API: Get menu items for a restaurant
  if (req.url.match(/^\/api\/menu\/\d+$/) && req.method === 'GET') {
    const restaurantId = req.url.split('/')[3];
    db.all('SELECT * FROM menu_items WHERE restaurant_id = ?', [restaurantId], (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows || []));
    });
    return;
  }

  // API: Create order
  if (req.url === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { customerName, restaurantId, items, totalPrice } = JSON.parse(body);
        db.run(
          'INSERT INTO orders (customer_name, restaurant_id, items, total_price) VALUES (?, ?, ?, ?)',
          [customerName, restaurantId, JSON.stringify(items), totalPrice],
          function(err) {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id: this.lastID, success: true }));
          }
        );
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // API: Get orders
  if (req.url === '/api/orders' && req.method === 'GET') {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows || []));
    });
    return;
  }

  // API: Update order status
  if (req.url.match(/^\/api\/orders\/\d+$/) && req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const orderId = req.url.split('/')[3];
        const { status } = JSON.parse(body);
        db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
