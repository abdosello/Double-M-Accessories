// ===========================
// Configuration
// ===========================
const API_URL = 'http://localhost:5000/api'; // Local development

// ===========================
// State Management
// ===========================
let products = [];
let orders = [];
let settings = {};
let isAuthenticated = false;

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
});

// ===========================
// Authentication
// ===========================
function checkAuthentication() {
    isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    
    if (isAuthenticated) {
        showDashboard();
        loadAllData();
    } else {
        showLogin();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_URL.replace('/api', '')}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.authenticated) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            isAuthenticated = true;
            showDashboard();
            loadAllData();
        } else {
            errorDiv.textContent = 'Invalid password. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please check your backend URL.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem('adminAuthenticated');
    isAuthenticated = false;
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
}

// ===========================
// Data Loading
// ===========================
async function loadAllData() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadSettings()
    ]);
    updateDashboard();
}

function updateDashboard() {
    // Update statistics
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalOrders').textContent = orders.length;
    
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    document.getElementById('pendingOrders').textContent = pendingCount;
    
    const inStockCount = products.filter(p => p.stock > 0).length;
    document.getElementById('inStockProducts').textContent = inStockCount;
    
    // Display recent orders
    displayRecentOrders();
}

function displayRecentOrders() {
    const container = document.getElementById('recentOrdersList');
    const recentOrders = orders.slice(0, 5); // Show last 5 orders
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">No recent orders</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${recentOrders.map(order => `
                    <tr>
                        <td><strong>${order.order_id}</strong></td>
                        <td>${order.customer_info.name}</td>
                        <td><strong>${order.total} EGP</strong></td>
                        <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                        <td>${new Date(order.date).toLocaleDateString('en-GB')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`);
        orders = await response.json();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders', 'error');
    }
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        settings = await response.json();
        displaySettings();
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

function displaySettings() {
    document.getElementById('whatsappNumber').value = settings.whatsapp_number || '';
    document.getElementById('facebookUrl').value = settings.facebook_url || '';
    document.getElementById('instagramUrl').value = settings.instagram_url || '';
    document.getElementById('heroTitle').value = settings.hero_title || 'Premium Men\'s Accessories';
    document.getElementById('heroSubtitle').value = settings.hero_subtitle || 'Rings, Bracelets & Wallets';
    
    const heroColor = settings.hero_color || '#667eea';
    document.getElementById('heroColor').value = heroColor;
    document.getElementById('heroColorText').value = heroColor;
}

// ===========================
// Display Functions
// ===========================
function displayProducts() {
    const container = document.getElementById('productsTable');
    
    if (products.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">No products found. Add your first product!</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => {
                    const mainImage = product.images && product.images.length > 0 ? product.images[0] : (product.image_url || '');
                    const displayPrice = product.salePrice ? `<span style="text-decoration: line-through; color: #999;">${product.price}</span> <span style="color: #d32f2f; font-weight: bold;">${product.salePrice} EGP</span>` : `${product.price} EGP`;
                    return `
                    <tr>
                        <td><img src="${mainImage}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;"></td>
                        <td>${product.name}</td>
                        <td>${displayPrice}</td>
                        <td>${product.stock > 0 ? `✅ ${product.stock} units` : '❌ Out of Stock'}</td>
                        <td>
                            <button class="action-btn btn-edit" onclick="editProduct('${product._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-btn btn-delete" onclick="deleteProduct('${product._id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function displayOrders() {
    const container = document.getElementById('ordersTable');
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">No orders yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td><strong>${order.order_id}</strong></td>
                        <td>${new Date(order.date).toLocaleDateString('en-GB')}</td>
                        <td>${order.customer_info.name}</td>
                        <td>${order.customer_info.phone}</td>
                        <td><strong>${order.total} EGP</strong></td>
                        <td>${order.payment_method}</td>
                        <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                        <td>
                            <button class="action-btn btn-view" onclick="viewOrderDetails('${order._id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <select onchange="updateOrderStatus('${order._id}', this.value)" style="padding: 5px; border-radius: 5px; margin-left: 5px;">
                                <option value="">Change Status</option>
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    
    content.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px; color: var(--primary-color);">Order #${order.order_id}</h3>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px;">📅 Order Date</h4>
                <p>${new Date(order.date).toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}</p>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px;">👤 Customer Information</h4>
                <p><strong>Name:</strong> ${order.customer_info.name}</p>
                <p><strong>Phone:</strong> <a href="tel:${order.customer_info.phone}">${order.customer_info.phone}</a></p>
                <p><strong>Governorate:</strong> ${order.customer_info.governorate}</p>
                <p><strong>Address:</strong> ${order.customer_info.address}</p>
                ${order.customer_info.notes ? `<p><strong>Notes:</strong> ${order.customer_info.notes}</p>` : ''}
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px;">📦 Order Items</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-light);">
                            <th style="padding: 10px; text-align: left;">Item</th>
                            <th style="padding: 10px;">Price</th>
                            <th style="padding: 10px;">Qty</th>
                            <th style="padding: 10px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 10px;">
                                    ${item.name}
                                    ${item.size ? `<br><small>Size: ${item.size}</small>` : ''}
                                    ${item.color ? `<br><small>Color: ${item.color}</small>` : ''}
                                </td>
                                <td style="padding: 10px; text-align: center;">${item.price} EGP</td>
                                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                                <td style="padding: 10px; text-align: center;"><strong>${item.price * item.quantity} EGP</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px;">💳 Payment & Status</h4>
                <p><strong>Payment Method:</strong> ${order.payment_method}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></p>
                <p><strong>Total Amount:</strong> <span style="font-size: 1.3rem; color: var(--secondary-color);">${order.total} EGP</span></p>
            </div>
            
            <div style="margin-top: 25px;">
                <a href="https://wa.me/${order.customer_info.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn-primary" style="display: inline-block; padding: 12px 25px; text-decoration: none;">
                    <i class="fab fa-whatsapp"></i> Contact Customer via WhatsApp
                </a>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// ===========================
// Product Functions
// ===========================
function openProductForm(productId = null) {
    const modal = document.getElementById('productFormModal');
    const title = document.getElementById('productFormTitle');
    const form = document.getElementById('productForm');
    
    form.reset();
    
    // Reset image container
    const container = document.getElementById('imageUrlsContainer');
    container.innerHTML = `
        <div class="image-url-input">
            <input type="url" class="productImageUrl" placeholder="Enter image URL" required>
            <button type="button" class="btn-remove-image" style="display:none;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Reset color picker container
    const colorContainer = document.getElementById('colorPickerContainer');
    colorContainer.innerHTML = '';
    
    if (productId) {
        const product = products.find(p => p._id === productId);
        if (!product) return;
        
        title.textContent = 'Edit Product';
        document.getElementById('editProductId').value = product._id;
        document.getElementById('productNameInput').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productStock').value = product.stock || 0;
        document.getElementById('productSalePrice').value = product.salePrice || '';
        document.getElementById('productSizes').value = product.sizes.join(', ');
        
        // Populate colors with picker
        if (product.colors && product.colors.length > 0) {
            product.colors.forEach(color => addColorPicker(color));
        }
        
        // Populate images
        const images = product.images || (product.image_url ? [product.image_url] : []);
        container.innerHTML = '';
        images.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'image-url-input';
            div.innerHTML = `
                <input type="url" class="productImageUrl" placeholder="Enter image URL" value="${url}" required>
                <button type="button" class="btn-remove-image" onclick="removeImageInput(this)" ${index === 0 ? 'style="display:none;"' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(div);
        });
    } else {
        title.textContent = 'Add Product';
        document.getElementById('editProductId').value = '';
        document.getElementById('productStock').value = 0;
    }
    
    modal.classList.add('active');
}

function editProduct(productId) {
    openProductForm(productId);
}

async function handleProductSubmit(event) {
    event.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    
    // Collect all image URLs
    const imageInputs = document.querySelectorAll('.productImageUrl');
    const images = Array.from(imageInputs).map(input => input.value.trim()).filter(url => url);
    
    if (images.length === 0) {
        showNotification('Please add at least one product image', 'error');
        return;
    }
    
    const salePriceValue = document.getElementById('productSalePrice').value;
    
    // Collect colors from color pickers
    const colorElements = document.querySelectorAll('.color-item');
    const colors = Array.from(colorElements).map(el => el.querySelector('.color-name-input').value.trim()).filter(c => c);
    
    const productData = {
        name: document.getElementById('productNameInput').value,
        price: parseFloat(document.getElementById('productPrice').value),
        images: images,
        description: document.getElementById('productDescription').value,
        stock: parseInt(document.getElementById('productStock').value) || 0,
        salePrice: salePriceValue ? parseFloat(salePriceValue) : null,
        sizes: document.getElementById('productSizes').value.split(',').map(s => s.trim()).filter(s => s),
        colors: colors
    };
    
    try {
        const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) throw new Error('Failed to save product');
        
        showNotification(productId ? 'Product updated successfully' : 'Product added successfully', 'success');
        closeModal('productFormModal');
        await loadProducts();
    } catch (error) {
        showNotification('Failed to save product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete product');
        
        showNotification('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        showNotification('Failed to delete product', 'error');
    }
}

// ===========================
// Order Functions
// ===========================
async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus || newStatus === '') return;
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update order status');
        
        showNotification('Order status updated successfully', 'success');
        await loadOrders();
    } catch (error) {
        showNotification('Failed to update order status', 'error');
    }
}

// ===========================
// Settings Functions
// ===========================
async function handleSettingsSubmit(event) {
    event.preventDefault();
    
    const settingsData = {
        whatsapp_number: document.getElementById('whatsappNumber').value,
        facebook_url: document.getElementById('facebookUrl').value,
        instagram_url: document.getElementById('instagramUrl').value,
        hero_title: document.getElementById('heroTitle').value,
        hero_subtitle: document.getElementById('heroSubtitle').value,
        hero_color: document.getElementById('heroColor').value
    };
    
    try {
        const response = await fetch(`${API_URL}/settings/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });
        
        if (!response.ok) throw new Error('Failed to save settings');
        
        showNotification('Settings saved successfully', 'success');
        await loadSettings();
    } catch (error) {
        showNotification('Failed to save settings', 'error');
    }
}

// ===========================
// Event Listeners
// ===========================
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}Tab`).classList.add('active');
        });
    });
    
    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductForm());
    }
    
    // Refresh orders button
    const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', loadOrders);
    }
    
    // Product form
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmit);
    }
    
    // Close modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Add image button
    const addImageBtn = document.getElementById('addImageBtn');
    if (addImageBtn) {
        addImageBtn.addEventListener('click', addImageInput);
    }
    
    // Add color button
    const addColorBtn = document.getElementById('addColorBtn');
    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => addColorPicker());
    }
    
    // Hero color picker
    const heroColorInput = document.getElementById('heroColor');
    if (heroColorInput) {
        heroColorInput.addEventListener('input', function() {
            document.getElementById('heroColorText').value = this.value;
        });
    }
}

// ===========================
// Color Picker Functions
// ===========================
function addColorPicker(colorName = 'Black') {
    const container = document.getElementById('colorPickerContainer');
    const colorId = 'color_' + Date.now();
    
    const div = document.createElement('div');
    div.className = 'color-item';
    div.innerHTML = `
        <input type="text" class="color-name-input" value="${colorName}" placeholder="Color name">
        <button type="button" class="btn-remove-color" onclick="removeColorPicker(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeColorPicker(button) {
    button.closest('.color-item').remove();
}

// ===========================
// Image Management Functions
// ===========================
function addImageInput() {
    const container = document.getElementById('imageUrlsContainer');
    const div = document.createElement('div');
    div.className = 'image-url-input';
    div.innerHTML = `
        <input type="url" class="productImageUrl" placeholder="Enter image URL" required>
        <button type="button" class="btn-remove-image" onclick="removeImageInput(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeImageInput(button) {
    const container = document.getElementById('imageUrlsContainer');
    const inputs = container.querySelectorAll('.image-url-input');
    
    // Keep at least one image input
    if (inputs.length > 1) {
        button.closest('.image-url-input').remove();
    } else {
        showNotification('At least one image is required', 'error');
    }
}

// ===========================
// Utility Functions
// ===========================
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background-color: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}
