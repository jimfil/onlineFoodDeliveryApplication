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
    renderAccountPage();
    renderBrowsePage();

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
            <a href="${isRoot ? 'pages/account.html' : 'account.html'}" class="btn btn-sm ${btnOutline} fw-bold me-2">${user.name}</a>
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
            const user = JSON.parse(userStr);
            let addresses = user.addresses || [];
            if (addresses.length === 0 && user.address) addresses.push(user.address);

            const cartAddressList = document.getElementById('cartAddressList');
            const accordionBtn = document.querySelector('#addressHeading .accordion-button');
            const addressCollapse = document.getElementById('addressCollapse');
            const bsCollapse = addressCollapse
                ? new bootstrap.Collapse(addressCollapse, { toggle: false })
                : null;

            // Render address buttons
            if (cartAddressList) {
                cartAddressList.innerHTML = addresses.map((addr, i) => `
                    <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                        ${i === 0 ? 'aria-current="true"' : ''}>${addr}</button>
                `).join('');

                // Wire up selection
                const allBtns = cartAddressList.querySelectorAll('button');
                function setCartActive(btn) {
                    allBtns.forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
                    btn.classList.add('active');
                    btn.setAttribute('aria-current', 'true');
                    if (accordionBtn) accordionBtn.textContent = btn.textContent.trim();
                    if (bsCollapse) bsCollapse.hide();
                }
                allBtns.forEach(btn => btn.addEventListener('click', () => setCartActive(btn)));

                // Set initial accordion header
                if (allBtns.length > 0 && accordionBtn) {
                    accordionBtn.textContent = allBtns[0].textContent.trim();
                }
            }

            // Wire up inline add-address form
            const toggleBtn = document.getElementById('cartToggleAddForm');
            const inlineForm = document.getElementById('cartInlineAddressForm');
            const saveBtn = document.getElementById('cartSaveAddress');
            if (toggleBtn && inlineForm) {
                toggleBtn.addEventListener('click', () => {
                    inlineForm.classList.toggle('d-none');
                });
            }
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const street = document.getElementById('cartNewStreet').value.trim();
                    const number = document.getElementById('cartNewNumber').value.trim();
                    if (!street || !number) return;
                    if (addAddressToUser(street, number)) {
                        document.getElementById('cartNewStreet').value = '';
                        document.getElementById('cartNewNumber').value = '';
                        if (inlineForm) inlineForm.classList.add('d-none');
                        renderCartPage(); // Re-render with new address
                        return; // renderCartPage calls renderCartItems
                    }
                });
            }
        }
    } else {
        // Guest
        if (loggedSection) loggedSection.classList.add('d-none');
        if (guestSection) {
            guestSection.classList.remove('d-none');
            const guestAddress = localStorage.getItem('guestAddress');
            if (guestAddress) document.getElementById('guestStreet').value = guestAddress;
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

function renderAccountPage() {
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const addAddressForm = document.getElementById('addAddressForm');
    const accountNameInput = document.getElementById('accountName');

    if (!updateNameForm) return; // Not on account page

    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html'; // Redirect if not logged in
        return;
    }

    const user = JSON.parse(userStr);

    // Initialize UI
    accountNameInput.value = user.name || '';
    renderAddresses(user);

    // Handle Name Update
    updateNameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        user.name = accountNameInput.value;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('nameSuccessMsg').classList.remove('d-none');
        updateAuthNav(); // Update the top bar
        setTimeout(() => document.getElementById('nameSuccessMsg').classList.add('d-none'), 3000);
    });

    // Handle Password Update
    updatePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('passwordSuccessMsg').classList.remove('d-none');
        updatePasswordForm.reset();
        setTimeout(() => document.getElementById('passwordSuccessMsg').classList.add('d-none'), 3000);
    });

    // Handle Add Address
    addAddressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const street = document.getElementById('newStreet').value;
        const number = document.getElementById('newStreetNumber').value;
        const newAddress = `${street} ${number}`;

        if (!user.addresses) {
            user.addresses = [];
            if (user.address) user.addresses.push(user.address);
        }

        if (!user.addresses.includes(newAddress)) {
            user.addresses.push(newAddress);
            user.address = newAddress; // make it primary
            localStorage.setItem('user', JSON.stringify(user));
            renderAddresses(user);
        }
        addAddressForm.reset();
    });
}

function renderAddresses(user) {
    const addressList = document.getElementById('addressList');
    if (!addressList) return;

    let addresses = user.addresses || [];
    if (addresses.length === 0 && user.address) {
        addresses.push(user.address);
    }

    const accordionButton = document.querySelector('#accountAddressHeading .accordion-button');

    if (addresses.length === 0) {
        addressList.innerHTML = '<div class="list-group-item text-muted">Δεν υπάρχουν αποθηκευμένες διευθύνσεις.</div>';
        if (accordionButton) accordionButton.textContent = 'Οι διευθύνσεις μου';
        return;
    }

    // Render as list-group-item buttons (same style as cart accordion)
    addressList.innerHTML = addresses.map((addr, index) => `
        <div class="list-group-item d-flex justify-content-between align-items-center${index === 0 ? ' active' : ''}"
             ${index === 0 ? 'aria-current="true"' : ''} data-index="${index}">
            <span>${addr}</span>
            <button class="btn btn-sm btn-outline-danger remove-address-btn ms-2" data-index="${index}">Αφαίρεση</button>
        </div>
    `).join('');

    // Update accordion header to show first (active) address
    if (accordionButton) accordionButton.textContent = addresses[0];

    // setActive logic (same pattern as cart.html)
    const items = addressList.querySelectorAll('.list-group-item');
    const addressCollapse = document.getElementById('accountAddressCollapse');
    const bootstrapCollapse = new bootstrap.Collapse(addressCollapse, { toggle: false });

    function setActive(item) {
        items.forEach(i => {
            i.classList.remove('active');
            i.removeAttribute('aria-current');
        });
        item.classList.add('active');
        item.setAttribute('aria-current', 'true');
        if (accordionButton) accordionButton.textContent = item.querySelector('span').textContent.trim();
        bootstrapCollapse.hide();
    }

    items.forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger setActive when clicking remove button
            if (e.target.closest('.remove-address-btn')) return;
            setActive(item);
        });
    });

    // Attach remove button event listeners
    const removeBtns = addressList.querySelectorAll('.remove-address-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            addresses.splice(index, 1);
            user.addresses = addresses;

            // If primary address is removed, fallback
            if (user.address && !addresses.includes(user.address)) {
                user.address = addresses.length > 0 ? addresses[0] : '';
            }

            localStorage.setItem('user', JSON.stringify(user));
            renderAddresses(user);
        });
    });
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

function renderBrowsePage() {
    const noAddressSection = document.getElementById('noAddressSection');
    const browseAddressAccordion = document.getElementById('browseAddressAccordion');
    const restaurantSection = document.getElementById('restaurantSection');
    const browseAddressList = document.getElementById('browseAddressList');

    if (!browseAddressAccordion) return; // Not on browse page

    const userStr = localStorage.getItem('user');
    let user = userStr ? JSON.parse(userStr) : null;
    let addresses = user ? (user.addresses || []) : [];
    if (addresses.length === 0 && user && user.address) addresses.push(user.address);

    function showAccordion() {
        if (noAddressSection) noAddressSection.classList.add('d-none');
        browseAddressAccordion.classList.remove('d-none');

        const accordionButton = document.querySelector('#browseAddressHeading .accordion-button');
        const addressCollapse = document.getElementById('browseAddressCollapse');
        const bsCollapse = new bootstrap.Collapse(addressCollapse, { toggle: false });

        // Re-read latest addresses
        const freshUser = JSON.parse(localStorage.getItem('user') || '{}');
        const freshAddresses = freshUser.addresses || [];
        if (freshAddresses.length === 0 && freshUser.address) freshAddresses.push(freshUser.address);

        browseAddressList.innerHTML = freshAddresses.map((addr, i) => `
            <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                ${i === 0 ? 'aria-current="true"' : ''}>${addr}</button>
        `).join('');

        if (accordionButton && freshAddresses.length > 0) accordionButton.textContent = freshAddresses[0];
        if (restaurantSection && freshAddresses.length > 0) restaurantSection.classList.remove('d-none');

        // Wire address clicks
        const addressButtons = browseAddressList.querySelectorAll('.list-group-item');
        function setActive(btn) {
            addressButtons.forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
            btn.classList.add('active');
            btn.setAttribute('aria-current', 'true');
            if (accordionButton) accordionButton.textContent = btn.textContent.trim();
            if (restaurantSection) restaurantSection.classList.remove('d-none');
            bsCollapse.hide();
        }
        addressButtons.forEach(btn => btn.addEventListener('click', () => setActive(btn)));

        // Wire inline add form inside accordion
        const toggleBtn = document.getElementById('browseToggleAddForm');
        const inlineForm = document.getElementById('browseInlineAddressForm');
        const saveBtn = document.getElementById('browseSaveAddress');
        if (toggleBtn && inlineForm && !toggleBtn.dataset.wired) {
            toggleBtn.dataset.wired = '1';
            toggleBtn.addEventListener('click', () => inlineForm.classList.toggle('d-none'));
            saveBtn.addEventListener('click', () => {
                const street = document.getElementById('browseNewStreet').value.trim();
                const number = document.getElementById('browseNewNumber').value.trim();
                const zip = document.getElementById('browseNewZipCode').value.trim();
                if (!street || !number) return;
                addAddressToUser(street, number, zip);
                document.getElementById('browseNewStreet').value = '';
                document.getElementById('browseNewNumber').value = '';
                document.getElementById('browseNewZipCode').value = '';
                inlineForm.classList.add('d-none');
                showAccordion();
            });
        }
    }

    if (addresses.length === 0) {
        // No addresses: show inline first-address form
        if (noAddressSection) noAddressSection.classList.remove('d-none');
        browseAddressAccordion.classList.add('d-none');
        if (restaurantSection) restaurantSection.classList.add('d-none');

        const firstSaveBtn = document.getElementById('browseFirstSaveAddress');
        if (firstSaveBtn && !firstSaveBtn.dataset.wired) {
            firstSaveBtn.dataset.wired = '1';
            firstSaveBtn.addEventListener('click', () => {
                const street = document.getElementById('browseFirstStreet').value.trim();
                const number = document.getElementById('browseFirstNumber').value.trim();
                if (!street || !number) return;
                addAddressToUser(street, number);
                showAccordion();
            });
        }
        return;
    }

    showAccordion();
}
