// ─── cart.js ─────────────────────────────────────────────────────
// Handles cart page: address selection, inline add-address, cart item rendering

document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateAuthNav === 'function') updateAuthNav();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    renderCartPage();
});

let cartLat = null;
let cartLon = null;

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

            getUserAddresses().then(addressesData => {
                const addresses = addressesData.map(addr => `${addr.street} ${addr.street_number}`);
                renderCartPageWithAddresses(addresses, user, cartLat, cartLon);
            }).catch(error => {
                console.error('Failed to load addresses:', error);
                let addresses = user.addresses || [];
                if (addresses.length === 0 && user.address) addresses.push(user.address);
                renderCartPageWithAddresses(addresses, user, cartLat, cartLon);
            });
        }
    } else {
        if (loggedSection) loggedSection.classList.add('d-none');
        if (guestSection) {
            guestSection.classList.remove('d-none');
            const guestAddress = localStorage.getItem('guestAddress');
            if (guestAddress) {
                const streetInput = document.getElementById('guestStreet');
                if (streetInput) streetInput.value = guestAddress;
            }

            if (!guestSection.dataset.wired) {
                guestSection.dataset.wired = '1';
                let guestMapObj = null;

                const toggleGuestMap = document.getElementById('toggleGuestMap');
                const guestMapContainer = document.getElementById('guestMapContainer');

                if (toggleGuestMap && guestMapContainer) {
                    toggleGuestMap.addEventListener('click', () => {
                        const isHidden = guestMapContainer.classList.contains('d-none');
                        guestMapContainer.classList.toggle('d-none');

                        if (isHidden) {
                            setTimeout(() => {
                                document.getElementById('guestAddressSearch')?.focus();
                            }, 150);
                        }

                        if (isHidden && !guestMapObj) {
                            guestMapObj = initLeafletMap(
                                'guestCartMap',
                                async (lat, lon) => {
                                    cartLat = lat;
                                    cartLon = lon;
                                    localStorage.setItem('guestLat', lat);
                                    localStorage.setItem('guestLon', lon);

                                    const addr = await reverseGeocode(lat, lon);
                                    fillAddressFields(addr, {
                                        streetId: 'guestStreet',
                                        numberId: 'guestNumber',
                                        zipId: 'guestZip'
                                    });
                                },
                                {
                                    searchInputId: 'guestAddressSearch',
                                    resultsContainerId: 'guestAddressResults',
                                    onAddressPicked: (selected) => {
                                        cartLat = selected.lat;
                                        cartLon = selected.lon;
                                        localStorage.setItem('guestLat', selected.lat);
                                        localStorage.setItem('guestLon', selected.lon);

                                        fillAddressFields(selected.address, {
                                            streetId: 'guestStreet',
                                            numberId: 'guestNumber',
                                            zipId: 'guestZip'
                                        });
                                    }
                                }
                            );

                            const glat = localStorage.getItem('guestLat');
                            const glon = localStorage.getItem('guestLon');
                            if (glat && glon) {
                                guestMapObj.map.setView([glat, glon], 16);
                                guestMapObj.marker.setLatLng([glat, glon]);
                            }
                        } else if (guestMapObj) {
                            setTimeout(() => guestMapObj.map.invalidateSize(), 100);
                        }
                    });
                }
            }
        }
        renderCartItems();
    }
}

function renderCartPageWithAddresses(addresses, user, cartLat, cartLon) {
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
    const toggleCartMap = document.getElementById('toggleCartMap');
    const cartMapContainer = document.getElementById('cartMapContainer');
    let cartInlineMapObj = null;

    if (toggleBtn && inlineForm && !toggleBtn.dataset.wired) {
    toggleBtn.dataset.wired = '1';

    toggleBtn.addEventListener('click', () => {
        inlineForm.classList.toggle('d-none');
    });

    if (toggleCartMap && cartMapContainer) {
        toggleCartMap.addEventListener('click', () => {
        const isHidden = cartMapContainer.classList.contains('d-none');
        cartMapContainer.classList.toggle('d-none');

        if (isHidden) {
            setTimeout(() => {
            document.getElementById('cartAddressSearch')?.focus();
            }, 150);
        }

        if (isHidden && !cartInlineMapObj) {
            cartInlineMapObj = initLeafletMap(
            'cartMap',
            async (lat, lon) => {
                cartLat = lat;
                cartLon = lon;

                const addr = await reverseGeocode(lat, lon);
                fillAddressFields(addr, {
                streetId: 'cartNewStreet',
                numberId: 'cartNewNumber',
                zipId: 'cartNewZipCode'
                });
            },
            {
                searchInputId: 'cartAddressSearch',
                resultsContainerId: 'cartAddressResults',
                onAddressPicked: (selected) => {
                cartLat = selected.lat;
                cartLon = selected.lon;

                fillAddressFields(selected.address, {
                    streetId: 'cartNewStreet',
                    numberId: 'cartNewNumber',
                    zipId: 'cartNewZipCode'
                });
                }
            }
            );
        } else if (cartInlineMapObj) {
            setTimeout(() => cartInlineMapObj.map.invalidateSize(), 100);
        }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
        const street = document.getElementById('cartNewStreet').value.trim();
        const number = document.getElementById('cartNewNumber').value.trim();
        const zip = document.getElementById('cartNewZipCode')?.value.trim() ?? '';

        if (!street || !number) return;

        const success = await addAddressToUser(street, number, zip, cartLat, cartLon);
        if (success) {
            cartLat = null;
            cartLon = null;
            renderCartPage();
        } else {
            alert('Σφάλμα κατά την αποθήκευση της διεύθυνσης.');
        }
        });
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
