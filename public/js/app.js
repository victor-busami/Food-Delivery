const API_URL = 'http://localhost:3000';
let cart = [];
let selectedRestaurantId = null;
let isAdminLoggedIn = false;

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

function formatCurrency(amount) {
  return `KSh ${amount.toFixed(2)}`;
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    e.target.classList.add('active');

    if (tabName === 'cart') updateCart();
    if (tabName === 'orders') loadOrders();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', handleAdminLogin);
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', placeOrder);
  }

  loadRestaurants();
});

function handleAdminLogin() {
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    isAdminLoggedIn = true;
    document.getElementById('adminLoginView').style.display = 'none';
    document.getElementById('adminStatusView').style.display = 'block';
    loadOrders();
    return;
  }

  alert('Invalid admin credentials');
}

function handleAdminLogout() {
  isAdminLoggedIn = false;
  document.getElementById('adminLoginView').style.display = 'block';
  document.getElementById('adminStatusView').style.display = 'none';
  document.getElementById('adminUsername').value = '';
  document.getElementById('adminPassword').value = '';
  loadOrders();
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      loadOrders();
    } else {
      alert('Unable to update order status');
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Unable to update order status');
  }
}

async function loadRestaurants() {
  try {
    const response = await fetch(`${API_URL}/api/restaurants`);
    const restaurants = await response.json();

    const list = document.getElementById('restaurantsList');
    list.innerHTML = restaurants.map((restaurant) => `
      <div class="restaurant-card" onclick="loadMenu(${restaurant.id}, '${restaurant.name}')">
        <div class="restaurant-name">${restaurant.name}</div>
        <div class="restaurant-cuisine">${restaurant.cuisine}</div>
        <div class="rating">⭐ ${restaurant.rating}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading restaurants:', error);
  }
}

async function loadMenu(restaurantId, restaurantName) {
  selectedRestaurantId = restaurantId;
  try {
    const response = await fetch(`${API_URL}/api/menu/${restaurantId}`);
    const items = await response.json();

    const container = document.getElementById('menuContainer');
    container.innerHTML = `
      <div class="menu-container">
        <button class="back-btn" onclick="loadRestaurants(); document.getElementById('menuContainer').innerHTML=''">← Back</button>
        <h2>${restaurantName}</h2>
        <div class="menu-items">
          ${items.map((item) => `
            <div class="menu-item">
              <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-description">${item.description}</div>
                <div class="item-price">${formatCurrency(item.price)}</div>
              </div>
              <div class="item-controls">
                <input type="number" class="qty-input" min="1" max="10" value="1" id="qty-${item.id}">
                <button class="add-btn" onclick="addToCart(${item.id}, '${item.name}', ${item.price}, document.getElementById('qty-${item.id}').value)">Add</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading menu:', error);
  }
}

function addToCart(itemId, itemName, price, qty) {
  const quantity = parseInt(qty, 10) || 1;
  const existingItem = cart.find((item) => item.id === itemId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ id: itemId, name: itemName, price, quantity, restaurantId: selectedRestaurantId });
  }

  alert(`${itemName} added to cart!`);
}

function updateCart() {
  const cartContainer = document.getElementById('cartItems');
  const checkoutForm = document.getElementById('checkoutForm');
  const emptyCart = document.getElementById('emptyCart');

  if (cart.length === 0) {
    cartContainer.innerHTML = '';
    checkoutForm.style.display = 'none';
    emptyCart.style.display = 'block';
    return;
  }

  emptyCart.style.display = 'none';
  checkoutForm.style.display = 'block';

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  cartContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-qty">Qty: ${item.quantity} × ${formatCurrency(item.price)}</div>
      </div>
      <div class="cart-item-price">${formatCurrency(item.price * item.quantity)}</div>
      <button class="remove-btn" onclick="removeFromCart(${index})">Remove</button>
    </div>
  `).join('');

  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('tax').textContent = formatCurrency(tax);
  document.getElementById('total').textContent = formatCurrency(total);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

async function placeOrder() {
  const customerName = document.getElementById('customerName').value;
  if (!customerName.trim()) {
    alert('Please enter your name');
    return;
  }

  if (cart.length === 0) {
    alert('Cart is empty');
    return;
  }

  try {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.08;

    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        restaurantId: selectedRestaurantId,
        items: cart,
        totalPrice
      })
    });

    if (response.ok) {
      alert('Order placed successfully!');
      cart = [];
      document.getElementById('customerName').value = '';
      updateCart();
      loadOrders();
    }
  } catch (error) {
    console.error('Error placing order:', error);
    alert('Error placing order');
  }
}

async function loadOrders() {
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    const orders = await response.json();

    const container = document.getElementById('ordersList');
    if (orders.length === 0) {
      container.innerHTML = '<div class="empty-message">No orders yet</div>';
      return;
    }

    container.innerHTML = orders.map((order) => `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">Order #${order.id}</div>
          <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
        </div>
        <div class="order-info">
          <strong>${order.customer_name}</strong> • ${new Date(order.created_at).toLocaleDateString()}
        </div>
        <div class="order-items">${JSON.parse(order.items).map((item) => `${item.name} (${item.quantity})`).join(', ')}</div>
        <div class="order-price">Total: ${formatCurrency(order.total_price)}</div>
        ${isAdminLoggedIn ? `
          <div class="order-actions">
            <button class="approve-btn" onclick="updateOrderStatus(${order.id}, 'approved')">Approve</button>
            <button class="reject-btn" onclick="updateOrderStatus(${order.id}, 'rejected')">Reject</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

window.loadMenu = loadMenu;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateOrderStatus = updateOrderStatus;