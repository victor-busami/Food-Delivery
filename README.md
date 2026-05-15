#  Food Delivery App

A minimalistic food delivery application with SQLite database and vanilla JavaScript.

## Features

 Browse restaurants and menu items
 Add items to cart
 Place orders with customer name
 View order history
 SQLite database (file-based)
 Vanilla JavaScript (no frameworks)
 Minimalistic UI

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

- `server.js` - Thin root launcher for the app server
- `src/server.js` - Node.js HTTP server with SQLite API
- `src/db.js` - Database setup and seed loading
- `src/data/seed.js` - Kenyan restaurant/menu seed data
- `public/index.html` - Frontend HTML shell
- `public/css/styles.css` - Stylesheet
- `public/js/app.js` - Frontend behavior and admin flow
- `db.sqlite` - SQLite database file (auto-created)
- `package.json` - Dependencies

## Database Schema

### Restaurants
- id
- name
- cuisine
- rating

### Menu Items
- id
- restaurant_id (FK)
- name
- description
- price

### Orders
- id
- customer_name
- restaurant_id (FK)
- items (JSON)
- total_price
- status
- created_at

## Usage

1. **Browse**: Select a restaurant to see the menu
2. **Add to Cart**: Choose items and quantities
3. **Checkout**: Enter your name and place order
4. **View Orders**: Check order history
5. **Add New Restaurant**: Add a new restaurant and its menu options

## API Endpoints

- `GET /` - Serve index.html
- `GET /api/restaurants` - Get all restaurants
- `GET /api/menu/:id` - Get menu items for restaurant
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders
- `PUT /api/orders/:id` - Update order status
