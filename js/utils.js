// ─── utils.js ────────────────────────────────────────────────────
// Shared utilities used across all pages

document.addEventListener('DOMContentLoaded', () => {
    // Redirect landing page if already logged in
    if (document.getElementById('landingForm') && localStorage.getItem('user')) {
        window.location.href = 'pages/browse.html';
        return;
    }

    // Redirect login/register page if already logged in
    if ((document.getElementById('loginForm') || document.getElementById('registerForm')) && localStorage.getItem('user')) {
        const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/pages/');
        window.location.href = isRoot ? 'pages/browse.html' : 'browse.html';
        return;
    }

    updateAuthNav();
    updateCartBadge();

    // Setup Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const user = { email: email, name: email.split('@')[0] };
            localStorage.setItem('user', JSON.stringify(user));
            let redirect = localStorage.getItem('redirectAfterLogin') || 'browse.html';
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        });
    }

    // Setup Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const firstName = document.getElementById('firstName').value;
            const street = document.getElementById('street').value;
            const streetNumber = document.getElementById('streetNumber').value;
            const user = { email: email, name: firstName, address: `${street} ${streetNumber}` };
            localStorage.setItem('user', JSON.stringify(user));
            let redirect = localStorage.getItem('redirectAfterLogin') || 'browse.html';
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = redirect;
        });
    }

    // Setup Landing Form
    const landingForm = document.getElementById('landingForm');
    if (landingForm) {
        landingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const address = document.getElementById('landingAddress').value;
            localStorage.setItem('guestAddress', address);
            window.location.href = 'pages/browse.html';
        });
    }

    // Setup Add to Cart Buttons
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.getAttribute('data-name');
            const price = parseFloat(btn.getAttribute('data-price'));
            addToCart({ name, price });
        });
    });
});

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
        authNav.innerHTML = `
            <a href="${isRoot ? 'pages/account.html' : 'account.html'}" class="btn btn-sm ${btnOutline} fw-bold me-2">${user.name}</a>
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
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    window.location.reload();
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

function addAddressToUser(street, number, zip = '') {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    const newAddress = [street, number, zip].filter(Boolean).join(', ');
    if (!user.addresses) {
        user.addresses = [];
        if (user.address) user.addresses.push(user.address);
    }
    if (!user.addresses.includes(newAddress)) {
        user.addresses.push(newAddress);
        user.address = newAddress;
        localStorage.setItem('user', JSON.stringify(user));
    }
    return true;
}
