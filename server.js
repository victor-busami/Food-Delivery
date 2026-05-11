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

  const restaurantSeed = [
    {
      id: 1,
      name: 'Nairobi Delights',
      cuisine: 'Kenyan',
      menuItems: [
        { id: 1, name: 'Ugali na Sukuma Wiki', description: 'Ugali served with seasoned sukuma wiki', price: 450 },
        { id: 2, name: 'Nyama Choma Platter', description: 'Grilled meat served with kachumbari', price: 1200 }
      ]
    },
    {
      id: 2,
      name: 'Mama Mboga Corner',
      cuisine: 'Kenyan',
      menuItems: [
        { id: 3, name: 'Githeri Special', description: 'Hearty githeri with avocado', price: 500 },
        { id: 4, name: 'Mukimo ya Kienyeji', description: 'Creamy mukimo with fresh greens', price: 650 }
      ]
    },
    {
      id: 3,
      name: 'Coastal Pot',
      cuisine: 'Kenyan',
      menuItems: [
        { id: 5, name: 'Kuku Pilau', description: 'Fragrant pilau served with chicken', price: 900 },
        { id: 6, name: 'Samaki wa Kupaka', description: 'Coconut fish served with rice', price: 1100 }
      ]
    }
  ];

  const syncSeedData = () => {
    restaurantSeed.forEach((restaurant) => {
      db.run(
        'INSERT INTO restaurants (id, name, cuisine) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, cuisine = excluded.cuisine',
        [restaurant.id, restaurant.name, restaurant.cuisine]
      );

      restaurant.menuItems.forEach((item) => {
        db.run(
          'INSERT INTO menu_items (id, restaurant_id, name, description, price) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET restaurant_id = excluded.restaurant_id, name = excluded.name, description = excluded.description, price = excluded.price',
          [item.id, restaurant.id, item.name, item.description, item.price]
        );
      });
    });
  };

  // Seed data
  db.get("SELECT COUNT(*) as count FROM restaurants", (err, row) => {
    if (row.count === 0) {
      syncSeedData();
      return;
    }

    syncSeedData();
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
