// ─── utils.js ────────────────────────────────────────────────────
// Shared utilities used across all pages

const API_BASE_URL = 'http://localhost:4005/api';

// Store token in localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function removeToken() {
    localStorage.removeItem('token');
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Authentication functions
async function loginUser(email, password) {
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function registerUser(email, password, firstName, lastName, contactPhone, street, streetNumber, zipCode) {
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, firstName, lastName, contactPhone, street, streetNumber, zipCode })
        });

        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function logoutUser() {
    removeToken();
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    window.location.reload();
}

// User profile functions
async function getUserProfile() {
    try {
        const data = await apiRequest('/users/profile');
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function updateUserProfile(updates) {
    try {
        const data = await apiRequest('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Address functions
async function getUserAddresses() {
    try {
        const data = await apiRequest('/users/addresses');
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function addUserAddress(street, streetNumber, zipCode, latitude, longitude) {
    try {
        const data = await apiRequest('/users/addresses', {
            method: 'POST',
            body: JSON.stringify({ street, streetNumber, zipCode, latitude, longitude })
        });
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function updateUserAddress(addressId, updates) {
    try {
        const data = await apiRequest(`/users/addresses/${addressId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function deleteUserAddress(addressId) {
    try {
        const data = await apiRequest(`/users/addresses/${addressId}`, {
            method: 'DELETE'
        });
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

function updateAuthNav() {
    const authNav = document.getElementById('authNav');
    if (!authNav) return;

    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/pages/');
    const btnOutline = isRoot ? 'btn-outline-primary' : 'btn-outline-light';

    let currentFile = window.location.pathname.split('/').pop() || 'browse.html';
    if (isRoot) currentFile = 'browse.html';

    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const firstName = (user.firstName && user.firstName !== 'undefined') ? user.firstName : '';
        const lastName = (user.lastName && user.lastName !== 'undefined') ? user.lastName : '';
        const displayName = (firstName && lastName) ? `${firstName} ${lastName}`.trim() : (user.name || user.email || 'Λογαριασμός');
        authNav.innerHTML = `
            <a href="${isRoot ? 'pages/account.html' : 'account.html'}" class="btn btn-sm ${btnOutline} fw-bold me-2">${displayName}</a>
            <button onclick="logout()" class="btn btn-sm btn-danger fw-bold">Αποσύνδεση</button>
        `;
    } else {
        const loginPath = isRoot ? 'pages/login.html' : 'login.html';
        authNav.innerHTML = `
            <a href="${loginPath}" onclick="localStorage.setItem('redirectAfterLogin', '${currentFile}')" class="btn btn-sm fw-bold text-auth">Σύνδεση/Εγγραφή</a>
        `;
    }
}

function logout() {
    if (!confirm('Είστε σίγουρος ότι θέλετε να αποσυνδεθείτε;')) return;
    logoutUser();
}

function getCart() {
    const cartStr = localStorage.getItem('cart');
    return cartStr ? JSON.parse(cartStr) : [];
}

function addToCart(item) {
    const cart = getCart();
    cart.push(item);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

function removeFromCart(name) {
    const cart = getCart();
    const idx = cart.findLastIndex(item => item.name === name);
    if (idx !== -1) {
        cart.splice(idx, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartBadge();
    }
}

function getItemCount(name) {
    return getCart().filter(item => item.name === name).length;
}

function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (!cartBadge) return;
    cartBadge.textContent = getCart().length;
}

async function addAddressToUser(street, number, zip = '') {
    try {
        await addUserAddress(street, number, zip);
        return true;
    } catch (error) {
        console.error('Failed to add address:', error);
        return false;
    }
}
