// ─── cart.js ─────────────────────────────────────────────────────
// Handles cart page: address selection, inline add-address, cart item rendering

document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateAuthNav === 'function') updateAuthNav();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    renderCartPage();
});

function renderCartPage() {
    if (!document.getElementById('cartItemsContainer')) return;

    const userStr = localStorage.getItem('user');
    const guestSection = document.getElementById('guestAddressSection');
    const loggedSection = document.getElementById('loggedAddressSection');

    if (userStr) {
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

            if (cartAddressList) {
                cartAddressList.innerHTML = addresses.map((addr, i) => `
                    <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                        ${i === 0 ? 'aria-current="true"' : ''}>${addr}</button>
                `).join('');

                const allBtns = cartAddressList.querySelectorAll('button');
                function setCartActive(btn) {
                    allBtns.forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
                    btn.classList.add('active');
                    btn.setAttribute('aria-current', 'true');
                    if (accordionBtn) accordionBtn.textContent = btn.textContent.trim();
                    if (bsCollapse) bsCollapse.hide();
                }
                allBtns.forEach(btn => btn.addEventListener('click', () => setCartActive(btn)));

                if (allBtns.length > 0 && accordionBtn) {
                    accordionBtn.textContent = allBtns[0].textContent.trim();
                }
            }

            // Inline add-address form
            const toggleBtn = document.getElementById('cartToggleAddForm');
            const inlineForm = document.getElementById('cartInlineAddressForm');
            const saveBtn = document.getElementById('cartSaveAddress');
            if (toggleBtn && inlineForm) {
                toggleBtn.addEventListener('click', () => inlineForm.classList.toggle('d-none'));
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
                        renderCartPage();
                        return;
                    }
                });
            }
        }
    } else {
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

    const grouped = {};
    cart.forEach(item => {
        if (!grouped[item.name]) grouped[item.name] = { price: item.price, count: 0 };
        grouped[item.name].count++;
    });

    let html = '';
    let subtotal = 0;

    for (const [name, data] of Object.entries(grouped)) {
        const itemTotal = data.price * data.count;
        subtotal += itemTotal;
        html += `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <div><h6 class="fw-bold mb-1">${name}</h6></div>
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
    document.getElementById('cartTotal').textContent = (subtotal + 1.00).toFixed(2) + '€';
}
