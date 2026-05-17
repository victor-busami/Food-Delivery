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

function buildImageVariant(imageUrl, width) {
  try {
    const url = new URL(imageUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('q', '80');
      url.searchParams.set('w', String(width));
      return url.toString();
    }
  } catch (error) {
    // Fall back to local-path handling below.
  }

  return imageUrl.replace(/-640(\.[^.]+)$/, `-${width}$1`);
}

function getResponsiveImageConfig(imageUrl) {
  const fallbackUrl = 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80';
  const resolvedUrl = imageUrl || fallbackUrl;

  return {
    src: buildImageVariant(resolvedUrl, 640),
    srcset: `${buildImageVariant(resolvedUrl, 640)} 640w, ${buildImageVariant(resolvedUrl, 1280)} 1280w`,
    sizes: '(max-width: 768px) 100vw, 140px'
  };
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
  updateNotificationDot();
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
      updateNotificationDot();
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
        
      </div>
    `).join('');

    list.innerHTML += `
      <div class="restaurant-card add-btn-card" onclick="showAddRestaurantForm()" style="display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; border: 2px dashed #ccc;">
        <div class="restaurant-name" style="font-size: 24px; margin-bottom: 5px;">+</div>
        <div class="restaurant-cuisine">Add Restaurant</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading restaurants:', error);
  }
}

function showAddRestaurantForm() {
  const list = document.getElementById('restaurantsList');
  list.innerHTML = `
    <div class="form-container" style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 100%; max-width: 400px;">
      <h3 style="margin-top: 0;">Add New Restaurant</h3>
      <input type="text" id="newRestName" placeholder="Restaurant Name" style="display:block; margin-bottom:10px; width:100%; padding:10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      <input type="text" id="newRestCuisine" placeholder="Cuisine Style (e.g., Kenyan)" style="display:block; margin-bottom:10px; width:100%; padding:10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      <input type="number" id="newRestRating" placeholder="Rating (0.0 to 5.0)" step="0.1" min="0" max="5" style="display:block; margin-bottom:15px; width:100%; padding:10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      <button onclick="submitNewRestaurant()" style="padding: 10px 15px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Save Restaurant</button>
      <button onclick="loadRestaurants()" style="padding: 10px 15px; margin-left: 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
    </div>
  `;
}

async function submitNewRestaurant() {
  const name = document.getElementById('newRestName').value;
  const cuisine = document.getElementById('newRestCuisine').value;
  const rating = parseFloat(document.getElementById('newRestRating').value) || 0;

  if (!name) return;

  try {
    const response = await fetch(`${API_URL}/api/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, cuisine, rating })
    });

    if (response.ok) {
      loadRestaurants();
    }
  } catch (error) {
    console.error('Error adding restaurant:', error);
  }
}

async function loadMenu(restaurantId, restaurantName) {
  selectedRestaurantId = restaurantId;
  try {
    const response = await fetch(`${API_URL}/api/menu/${restaurantId}`);
    const items = await response.json();

    const categories = items.reduce((acc, item) => {
      const category = item.category || 'Main Dish';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    const container = document.getElementById('menuContainer');
    let menuContent = `
      <div class="menu-container">
        <button class="back-btn" onclick="loadRestaurants(); document.getElementById('menuContainer').innerHTML=''">← Back</button>
        <h2 id="currentRestaurantName">${restaurantName}</h2>
    `;

    for (const [category, categoryItems] of Object.entries(categories)) {
      menuContent += `
        <h3 style="margin-top: 25px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">${category}</h3>
        <div class="menu-items">
          ${categoryItems.map((item) => `
            <div class="menu-item">
              <div class="item-media">
                ${(() => {
                  const image = getResponsiveImageConfig(item.image_url);
                  return `
                    <img
                      class="item-image"
                      src="${image.src}"
                      ${image.srcset ? `srcset="${image.srcset}" sizes="${image.sizes}"` : ''}
                      alt="${item.name}"
                      loading="lazy"
                      decoding="async"
                    >
                  `;
                })()}
              </div>
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
      `;
    }

    menuContent += `
      <div style="margin-top: 30px; padding: 15px; border: 2px dashed #ccc; border-radius: 8px; text-align: center; cursor: pointer; background: #fafafa;" onclick="document.getElementById('addMenuItemForm').style.display='block'">
        <h4 style="margin: 0; color: #555;">+ Add New Menu Item</h4>
      </div>
      <div id="addMenuItemForm" style="display: none; margin-top: 15px; padding: 20px; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <h4 style="margin-top: 0;">New Dish Details</h4>
        <input type="text" id="newItemName" placeholder="Dish Name (e.g., Chapati)" style="display:block; margin-bottom:10px; width:100%; padding:8px; box-sizing: border-box;">
        <input type="text" id="newItemDesc" placeholder="Description" style="display:block; margin-bottom:10px; width:100%; padding:8px; box-sizing: border-box;">
        <input type="number" id="newItemPrice" placeholder="Price (KSh)" style="display:block; margin-bottom:10px; width:100%; padding:8px; box-sizing: border-box;">
        <input type="text" id="newItemCategory" placeholder="Category (Drinks, Dessert, Main Dish)" style="display:block; margin-bottom:15px; width:100%; padding:8px; box-sizing: border-box;">
        <input type="text" id="newItemImageUrl" placeholder="Image URL (optional, e.g. /assets/images/dishes/chapati-640.jpg)" style="display:block; margin-bottom:15px; width:100%; padding:8px; box-sizing: border-box;">
        <button onclick="submitNewMenuItem()" style="padding: 10px 15px; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Save Dish</button>
        <button onclick="document.getElementById('addMenuItemForm').style.display='none'" style="padding: 10px 15px; margin-left: 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    </div>`;

    container.innerHTML = menuContent;
    updateCart();
  } catch (error) {
    console.error('Error loading menu:', error);
  }
}

async function submitNewMenuItem() {
  const name = document.getElementById('newItemName').value;
  const description = document.getElementById('newItemDesc').value;
  const price = parseFloat(document.getElementById('newItemPrice').value);
  const category = document.getElementById('newItemCategory').value;
  const imageUrl = document.getElementById('newItemImageUrl').value.trim();

  if (!name || isNaN(price)) {
    alert("Please enter a valid name and price.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: selectedRestaurantId,
        name,
        description,
        price,
        category: category || 'Main Dish',
        imageUrl: imageUrl || null
      })
    });

    if (response.ok) {
      const restName = document.getElementById('currentRestaurantName').innerText;
      loadMenu(selectedRestaurantId, restName);
    } else {
      alert("Error saving item.");
    }
  } catch (error) {
    console.error('Error adding menu item:', error);
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

  updateCart();
}

function updateCart() {
  const cartContainer = document.getElementById('cartItems');
  const checkoutForm = document.getElementById('checkoutForm');
  const emptyCart = document.getElementById('emptyCart');

  if (!cartContainer || !checkoutForm || !emptyCart) return;

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
      updateNotificationDot();
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

async function updateNotificationDot() {
  try {
    const response = await fetch(`${API_URL}/api/orders`);
    const orders = await response.json();
    const hasPending = orders.some(order => order.status === 'pending');
    const dot = document.getElementById('notificationDot');
    if (dot) {
      dot.style.display = hasPending ? 'inline-block' : 'none';
    }
  } catch (error) {
    console.error('Error updating notification dot:', error);
  }
}

window.loadMenu = loadMenu;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateOrderStatus = updateOrderStatus;
window.showAddRestaurantForm = showAddRestaurantForm;
window.submitNewRestaurant = submitNewRestaurant;
window.submitNewMenuItem = submitNewMenuItem;
