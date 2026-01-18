// ===========================
// Configuration
// ===========================
const API_URL = 'https://back-m.onrender.com/api'; // Local development

// ===========================
// State Management
// ===========================
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let settings = {};
let currentLang = localStorage.getItem('language') || 'en';
let selectedProduct = null;

// ===========================
// Initialization
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadProducts();
    updateCartUI();
    setupEventListeners();
    applyLanguage();
});

// ===========================
// API Functions
// ===========================
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        settings = await response.json();
        
        // Update WhatsApp button
        const whatsappBtn = document.getElementById('whatsappBtn');
        if (settings.whatsapp_number) {
            whatsappBtn.href = `https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, '')}`;
        }
        
        // Update social links
        const facebookLink = document.getElementById('facebookLink');
        const instagramLink = document.getElementById('instagramLink');
        if (settings.facebook_url) facebookLink.href = settings.facebook_url;
        if (settings.instagram_url) instagramLink.href = settings.instagram_url;
        
        // Update hero section
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroSection = document.querySelector('.hero');
        
        if (settings.hero_title && heroTitle) {
            heroTitle.textContent = settings.hero_title;
            heroTitle.setAttribute('data-en', settings.hero_title);
        }
        if (settings.hero_subtitle && heroSubtitle) {
            heroSubtitle.textContent = settings.hero_subtitle;
            heroSubtitle.setAttribute('data-en', settings.hero_subtitle);
        }
        if (settings.hero_color && heroSection) {
            heroSection.style.background = `linear-gradient(135deg, ${settings.hero_color} 0%, ${adjustColorBrightness(settings.hero_color, -30)} 100%)`;
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

// Helper to darken color for gradient
function adjustColorBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsGrid').innerHTML = 
            '<div class="loading">Failed to load products. Please try again later.</div>';
    }
}

async function createOrder(orderData) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) throw new Error('Failed to create order');
        
        const order = await response.json();
        return order;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

// ===========================
// Display Functions
// ===========================
function displayProducts(productsToDisplay) {
    const grid = document.getElementById('productsGrid');
    
    if (productsToDisplay.length === 0) {
        grid.innerHTML = '<div class="loading" data-en="No products found" data-ar="لا توجد منتجات">No products found</div>';
        applyLanguage();
        return;
    }
    
    grid.innerHTML = productsToDisplay.map(product => {
        const mainImage = product.images && product.images.length > 0 ? product.images[0] : (product.image_url || 'assets/placeholder.jpg');
        const isOnSale = product.salePrice && product.salePrice < product.price;
        const displayPrice = isOnSale 
            ? `<span class="old-price">${product.price}</span> <span class="sale-price">${product.salePrice} EGP</span>`
            : `${product.price} EGP`;
        const stockBadge = product.stock === 0 ? '<div class="out-of-stock-badge">Out of Stock</div>' : (product.stock < 5 ? `<div class="low-stock-badge">Only ${product.stock} left</div>` : '');
        
        return `
        <div class="product-card ${product.stock === 0 ? 'out-of-stock' : ''}">
            ${stockBadge}
            ${isOnSale ? '<div class="sale-badge">SALE</div>' : ''}
            <img src="${mainImage}" alt="${product.name}" onerror="this.src='assets/placeholder.jpg'" onclick="openProductModal('${product._id}')">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${displayPrice}</div>
                <div class="product-actions">
                    <button class="btn-buy-now" onclick="event.stopPropagation(); buyNow('${product._id}')" ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i> Buy Now
                    </button>
                    <button class="btn-view-details" onclick="event.stopPropagation(); openProductModal('${product._id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function openProductModal(productId, quickBuyMode = false) {
    selectedProduct = products.find(p => p._id === productId);
    if (!selectedProduct) return;
    
    const modal = document.getElementById('productModal');
    document.getElementById('productName').textContent = selectedProduct.name;
    
    // Handle multiple images
    const images = selectedProduct.images || (selectedProduct.image_url ? [selectedProduct.image_url] : ['assets/placeholder.jpg']);
    const productImageEl = document.getElementById('productImage');
    productImageEl.src = images[0];
    
    // Create image gallery if multiple images
    let imageGallery = '';
    if (images.length > 1) {
        imageGallery = `
            <div class="image-gallery" style="display: flex; gap: 10px; margin-top: 10px; overflow-x: auto;">
                ${images.map((img, index) => `
                    <img src="${img}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; cursor: pointer; border: 2px solid ${index === 0 ? 'var(--primary-color)' : 'transparent'};"
                         onclick="changeMainImage('${img}', this)">
                `).join('')}
            </div>
        `;
    }
    
    // Insert gallery after main image if not already there
    if (!productImageEl.nextElementSibling || !productImageEl.nextElementSibling.classList.contains('image-gallery')) {
        productImageEl.insertAdjacentHTML('afterend', imageGallery);
    }
    
    document.getElementById('productDescription').textContent = selectedProduct.description || 'Premium quality product from Double M Accessories';
    
    // Handle price display with sale
    const isOnSale = selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.price;
    const priceEl = document.getElementById('productPrice');
    if (isOnSale) {
        priceEl.innerHTML = `<span style="text-decoration: line-through; color: #999; margin-right: 10px;">${selectedProduct.price} EGP</span> <span style="color: var(--secondary-color); font-weight: bold; font-size: 1.3em;">${selectedProduct.salePrice} EGP</span>`;
    } else {
        priceEl.textContent = `${selectedProduct.price} EGP`;
    }
    
    // Update button text based on mode
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (quickBuyMode) {
        addToCartBtn.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
        addToCartBtn.classList.add('quick-buy-mode');
        addToCartBtn.onclick = function() {
            addToCartQuickBuy();
        };
    } else {
        addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addToCartBtn.classList.remove('quick-buy-mode');
        addToCartBtn.onclick = addToCart;
    }
    
    // Handle sizes
    const sizeSection = document.getElementById('sizeSection');
    const sizeOptions = document.getElementById('sizeOptions');
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        sizeSection.style.display = 'block';
        sizeOptions.innerHTML = selectedProduct.sizes.map(size => 
            `<button class="option-btn" data-size="${size}">${size}</button>`
        ).join('');
        
        // Add click handlers
        sizeOptions.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                sizeOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    } else {
        sizeSection.style.display = 'none';
    }
    
    // Handle colors
    const colorSection = document.getElementById('colorSection');
    const colorOptions = document.getElementById('colorOptions');
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        colorSection.style.display = 'block';
        colorOptions.innerHTML = selectedProduct.colors.map(color => 
            `<button class="option-btn" data-color="${color}">${color}</button>`
        ).join('');
        
        // Add click handlers
        colorOptions.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                colorOptions.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    } else {
        colorSection.style.display = 'none';
    }
    
    // Reset quantity
    document.getElementById('quantity').value = 1;
    
    modal.classList.add('active');
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
}

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="loading" data-en="Your cart is empty" data-ar="سلتك فارغة">Your cart is empty</div>';
        cartTotal.textContent = '0 EGP';
        applyLanguage();
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        total += item.price * item.quantity;
        return `
            <div class="cart-item">
                <img src="${item.image_url}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">
                        ${item.size ? `Size: ${item.size}` : ''} 
                        ${item.color ? `| Color: ${item.color}` : ''}
                        | Qty: ${item.quantity}
                    </div>
                    <div class="cart-item-price">${item.price * item.quantity} EGP</div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    cartTotal.textContent = `${total} EGP`;
}

function displayCheckout() {
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    let total = 0;
    checkoutItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="checkout-item">
                <span>${item.name} x${item.quantity}</span>
                <span>${itemTotal} EGP</span>
            </div>
        `;
    }).join('');
    
    checkoutTotal.textContent = `${total} EGP`;
}

// ===========================
// Cart Functions
// ===========================
function addToCart() {
    if (!selectedProduct) return;
    
    // Check stock availability
    if (selectedProduct.stock === 0) {
        showNotification('This product is out of stock', 'error');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value);
    
    // Validate quantity against stock
    if (quantity > selectedProduct.stock) {
        showNotification(`Only ${selectedProduct.stock} units available`, 'error');
        return;
    }
    
    // Validate size selection
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        const selectedSize = document.querySelector('#sizeOptions .option-btn.selected');
        if (!selectedSize) {
            showNotification('Please select a size', 'error');
            return;
        }
    }
    
    // Validate color selection
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        const selectedColor = document.querySelector('#colorOptions .option-btn.selected');
        if (!selectedColor) {
            showNotification('Please select a color', 'error');
            return;
        }
    }
    
    const selectedSize = document.querySelector('#sizeOptions .option-btn.selected')?.dataset.size || '';
    const selectedColor = document.querySelector('#colorOptions .option-btn.selected')?.dataset.color || '';
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => 
        item.product_id === selectedProduct._id && 
        item.size === selectedSize && 
        item.color === selectedColor
    );
    
    // Use sale price if available
    const price = selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.price 
        ? selectedProduct.salePrice 
        : selectedProduct.price;
    
    // Get main image
    const mainImage = selectedProduct.images && selectedProduct.images.length > 0 
        ? selectedProduct.images[0] 
        : selectedProduct.image_url;
    
    if (existingItemIndex > -1) {
        const newQuantity = cart[existingItemIndex].quantity + quantity;
        if (newQuantity > selectedProduct.stock) {
            showNotification(`Only ${selectedProduct.stock} units available`, 'error');
            return;
        }
        cart[existingItemIndex].quantity = newQuantity;
    } else {
        cart.push({
            product_id: selectedProduct._id,
            name: selectedProduct.name,
            price: price,
            quantity: quantity,
            size: selectedSize,
            color: selectedColor,
            image_url: mainImage
        });
    }
    
    updateCartUI();
    closeModal('productModal');
    showNotification('Product added to cart!', 'success');
}

function addToCartQuickBuy() {
    if (!selectedProduct) return;
    
    // Check stock availability
    if (selectedProduct.stock === 0) {
        showNotification('This product is out of stock', 'error');
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value);
    
    // Validate quantity against stock
    if (quantity > selectedProduct.stock) {
        showNotification(`Only ${selectedProduct.stock} units available`, 'error');
        return;
    }
    
    // Validate size selection if applicable
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        const selectedSize = document.querySelector('#sizeOptions .option-btn.selected');
        if (!selectedSize) {
            showNotification('Please select a size', 'error');
            return;
        }
    }
    
    // Validate color selection if applicable
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        const selectedColor = document.querySelector('#colorOptions .option-btn.selected');
        if (!selectedColor) {
            showNotification('Please select a color', 'error');
            return;
        }
    }
    
    const selectedSize = document.querySelector('#sizeOptions .option-btn.selected')?.dataset.size || '';
    const selectedColor = document.querySelector('#colorOptions .option-btn.selected')?.dataset.color || '';
    
    // Use sale price if available
    const price = selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.price 
        ? selectedProduct.salePrice 
        : selectedProduct.price;
    
    // Get main image
    const mainImage = selectedProduct.images && selectedProduct.images.length > 0 
        ? selectedProduct.images[0] 
        : selectedProduct.image_url;
    
    // Clear cart and add only this product for quick buy
    cart = [{
        product_id: selectedProduct._id,
        name: selectedProduct.name,
        price: price,
        quantity: quantity,
        size: selectedSize,
        color: selectedColor,
        image_url: mainImage
    }];
    
    updateCartUI();
    closeModal('productModal');
    displayCheckout();
    openModal('checkoutModal');
    showNotification('Proceeding to checkout...', 'success');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    displayCart();
    showNotification('Item removed from cart', 'success');
}

// ===========================
// Buy Now Function
// ===========================
function buyNow(productId) {
    const product = products.find(p => p._id === productId);
    if (!product || product.stock === 0) {
        showNotification('Product not available', 'error');
        return;
    }
    
    // Open product modal in quick-buy mode
    selectedProduct = product;
    openProductModal(productId, true);
}

// ===========================
// Order Functions
// ===========================
async function handleCheckout(event) {
    event.preventDefault();
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    const formData = {
        customer_info: {
            name: document.getElementById('customerName').value,
            phone: document.getElementById('customerPhone').value,
            governorate: document.getElementById('customerGovernorate').value,
            address: document.getElementById('customerAddress').value,
            notes: document.getElementById('customerNotes').value
        },
        items: cart.map(item => ({
            product_id: item.product_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color
        })),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        payment_method: document.querySelector('input[name="payment"]:checked').value
    };
    
    try {
        // Show loading
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const order = await createOrder(formData);
        
        // Clear cart
        cart = [];
        updateCartUI();
        
        // Close checkout modal
        closeModal('checkoutModal');
        
        // Show success message
        showNotification(
            `Order #${order.order_id} Placed Successfully! We will contact you via WhatsApp very soon.`,
            'success',
            5000
        );
        
        // Reset form
        document.getElementById('checkoutForm').reset();
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
    } catch (error) {
        showNotification('Failed to place order. Please try again.', 'error');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = currentLang === 'ar' ? 'تأكيد الطلب' : 'Place Order';
    }
}

// ===========================
// Event Listeners
// ===========================
function setupEventListeners() {
    // Cart button
    document.getElementById('cartBtn').addEventListener('click', () => {
        displayCart();
        openModal('cartModal');
    });
    
    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        if (cart.length === 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }
        closeModal('cartModal');
        displayCheckout();
        openModal('checkoutModal');
    });
    
    // Add to cart button
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
    
    // Quantity controls
    document.getElementById('increaseQty').addEventListener('click', () => {
        const qty = document.getElementById('quantity');
        qty.value = parseInt(qty.value) + 1;
    });
    
    document.getElementById('decreaseQty').addEventListener('click', () => {
        const qty = document.getElementById('quantity');
        if (parseInt(qty.value) > 1) {
            qty.value = parseInt(qty.value) - 1;
        }
    });
    
    // Language toggle
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    
    // Checkout form
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
    
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
}

// ===========================
// Language Functions
// ===========================
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('language', currentLang);
    applyLanguage();
}

function applyLanguage() {
    const html = document.documentElement;
    const langBtn = document.getElementById('currentLang');
    
    if (currentLang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
        langBtn.textContent = 'AR';
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
        langBtn.textContent = 'EN';
    }
    
    // Update all elements with data-en and data-ar attributes
    document.querySelectorAll('[data-en][data-ar]').forEach(element => {
        const text = currentLang === 'ar' ? element.dataset.ar : element.dataset.en;
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = text;
        } else {
            element.textContent = text;
        }
    });
}

// ===========================
// Utility Functions
// ===========================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
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

// ===========================
// Image Gallery Helper
// ===========================
function changeMainImage(imageSrc, thumbnailElement) {
    const mainImage = document.getElementById('productImage');
    mainImage.src = imageSrc;
    
    // Update thumbnail borders
    const gallery = thumbnailElement.closest('.image-gallery');
    if (gallery) {
        gallery.querySelectorAll('img').forEach(img => {
            img.style.border = '2px solid transparent';
        });
        thumbnailElement.style.border = '2px solid var(--primary-color)';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


