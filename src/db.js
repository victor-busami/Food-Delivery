const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { restaurants } = require('./data/seed');

const DB_PATH = path.join(__dirname, '..', 'db.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

function createTables() {
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
}

function seedRestaurants() {
  restaurants.forEach((restaurant) => {
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
}

function initializeDatabase() {
  db.serialize(() => {
    createTables();
    db.get('SELECT COUNT(*) as count FROM restaurants', (err, row) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (row && row.count === 0) {
        seedRestaurants();
        return;
      }

      seedRestaurants();
    });
  });
}

initializeDatabase();

module.exports = db;