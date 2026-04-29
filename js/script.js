document.addEventListener('DOMContentLoaded', () => {
    // If on the landing page and already logged in, redirect to browse
    if (document.getElementById('landingForm') && localStorage.getItem('user')) {
        window.location.href = 'pages/browse.html';
        return;
    }

    // If on login/register page and already logged in, redirect to browse
    if ((document.getElementById('loginForm') || document.getElementById('registerForm')) && localStorage.getItem('user')) {
        const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/pages/');
        window.location.href = isRoot ? 'pages/browse.html' : 'browse.html';
        return;
    }

    updateAuthNav();
    updateCartBadge();
    renderCartPage();

    // Setup Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const user = { email: email, name: email.split('@')[0] };
            localStorage.setItem('user', JSON.stringify(user));
            // Redirect to previous page or browse
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
            // Redirect to previous page or browse
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
            // Store a temporary guest session
            localStorage.setItem('guestAddress', address);
            // Redirect to browse
            window.location.href = 'pages/browse.html';
        });
    }

    // Setup Add to Cart Buttons
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
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
    const textColor = isRoot ? 'text-dark' : 'text-white';
    const btnOutline = isRoot ? 'btn-outline-primary' : 'btn-outline-light';
    
    let currentFile = window.location.pathname.split('/').pop() || 'browse.html';
    if (isRoot) currentFile = 'browse.html'; // Always go to browse from landing

    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        // User is logged in
        authNav.innerHTML = `
            <span class="fw-bold ${textColor} me-3" style="font-size: 0.9rem;">Καλωσήρθες, ${user.name}</span>
            <a href="#" class="btn btn-sm ${btnOutline} fw-bold me-2">Ο Λογαριασμός Μου</a>
            <button onclick="logout()" class="btn btn-sm btn-danger fw-bold">Αποσύνδεση</button>
        `;
    } else {
        // Not logged in
        const loginPath = isRoot ? 'pages/login.html' : 'login.html';

        authNav.innerHTML = `
            <a href="${loginPath}" onclick="localStorage.setItem('redirectAfterLogin', '${currentFile}')" class="btn btn-sm fw-bold text-auth">Σύνδεση/Εγγραφή</a>
        `;
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('cart'); // Clear cart on logout
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

function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    if (!cartBadge) return;
    const cart = getCart();
    cartBadge.textContent = cart.length;
}

function renderCartPage() {
    // Only run if we are on the cart page
    if (!document.getElementById('cartItemsContainer')) return;

    const userStr = localStorage.getItem('user');
    const guestSection = document.getElementById('guestAddressSection');
    const loggedSection = document.getElementById('loggedAddressSection');

    if (userStr) {
        // User is logged in
        if (guestSection) guestSection.classList.add('d-none');
        if (loggedSection) {
            loggedSection.classList.remove('d-none');
            // Try to add their saved address from registration
            const user = JSON.parse(userStr);
            if (user.address) {
                const listGroup = loggedSection.querySelector('.list-group');
                if (listGroup && !listGroup.innerHTML.includes(user.address)) {
                    // Prepend the new address and make it active
                    const currentActive = listGroup.querySelector('.active');
                    if (currentActive) {
                        currentActive.classList.remove('active');
                        currentActive.removeAttribute('aria-current');
                    }
                    const newBtn = document.createElement('button');
                    newBtn.type = 'button';
                    newBtn.className = 'list-group-item list-group-item-action active';
                    newBtn.setAttribute('aria-current', 'true');
                    newBtn.textContent = user.address;
                    listGroup.insertBefore(newBtn, listGroup.firstChild);
                    
                    // Update accordion header
                    const accordionButton = document.querySelector('#addressHeading .accordion-button');
                    if (accordionButton) accordionButton.textContent = user.address;
                }
            }
        }
    } else {
        // Guest
        if (loggedSection) loggedSection.classList.add('d-none');
        if (guestSection) {
            guestSection.classList.remove('d-none');
            const guestAddress = localStorage.getItem('guestAddress');
            if (guestAddress) {
                document.getElementById('guestStreet').value = guestAddress;
            }
        }
    }

    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    const cart = getCart();
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-muted fst-italic">Το καλάθι σας είναι άδειο.</p>';
        document.getElementById('cartSubtotal').textContent = '0.00€';
        document.getElementById('cartTotal').textContent = '0.00€';
        return;
    }

    // Group items by name to handle quantities
    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.name]) {
            grouped[item.name] = { price: item.price, count: 0 };
        }
        grouped[item.name].count++;
    });

    let html = '';
    let subtotal = 0;

    for (const [name, data] of Object.entries(grouped)) {
        const itemTotal = data.price * data.count;
        subtotal += itemTotal;
        html += `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <div>
                <h6 class="fw-bold mb-1">${name}</h6>
            </div>
            <div class="d-flex align-items-center gap-4">
                <div class="btn-group btn-group-sm">
                    <span class="btn btn-light border disabled text-dark px-3 py-1">${data.count}</span>
                </div>
                <span class="fw-bold" style="width: 50px; text-align: right;">${itemTotal.toFixed(2)}€</span>
            </div>
        </div>
        `;
    }

    container.innerHTML = html;
    
    document.getElementById('cartSubtotal').textContent = subtotal.toFixed(2) + '€';
    const total = subtotal + 1.00; // Fixed 1.00 delivery cost
    document.getElementById('cartTotal').textContent = total.toFixed(2) + '€';
}
