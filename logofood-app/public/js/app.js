/**
 * public/js/app.js
 * Shared client-side utilities for logofood-app.
 * Loaded by every page via the main.hbs layout.
 */

// ─── Cart badge ───────────────────────────────────────────────────────────────
async function refreshCartBadge() {
    try {
        const res  = await fetch('/cart/count');
        const data = await res.json();
        const badge = document.getElementById('cartBadge');
        if (badge) badge.textContent = data.count;
    } catch (_) { /* silently ignore */ }
}

// Run on every page load
refreshCartBadge();

const notificationState = {
    role: null,
    pendingOrderCount: null,
    orderStatusById: {},
    initialized: false
};

function createNotificationElement() {
    let container = document.getElementById('liveNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'liveNotificationContainer';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1100';
        document.body.appendChild(container);
    }
    return container;
}

function showLiveNotification(message, variant = 'info') {
    const container = createNotificationElement();
    const alert = document.createElement('div');
    alert.className = `alert alert-${variant} alert-dismissible fade show shadow-sm`;
    alert.style.minWidth = '280px';
    alert.style.maxWidth = '360px';
    alert.innerHTML = `
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.appendChild(alert);
    setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 300);
    }, 6000);
}

function updateTrackOrdersBadge(hasPending) {
    document.querySelectorAll('a[href="/track-orders"]').forEach(link => {
        const badge = link.querySelector('.badge-tiny');
        if (hasPending) {
            if (!badge) {
                const dot = document.createElement('span');
                dot.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-tiny';
                dot.innerHTML = '&nbsp;';
                link.appendChild(dot);
            }
        } else if (badge) {
            badge.remove();
        }
    });
}

function showRestaurantNewOrderBanner() {
    if (document.getElementById('restaurantNewOrderAlert')) return;
    const main = document.querySelector('main');
    if (!main) return;
    if (main.querySelector('a.alert-link[href="/manage/orders"]')) return;

    const banner = document.createElement('div');
    banner.id = 'restaurantNewOrderAlert';
    banner.className = 'alert alert-warning alert-dismissible fade show mb-4';
    banner.role = 'alert';
    banner.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        Έχετε νέες εκκρεμείς παραγγελίες! <a href="/manage/orders" class="alert-link">Δείτε τις παραγγελίες</a>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    main.insertBefore(banner, main.firstChild);
}

function buildOrderMap(orders) {
    return orders.reduce((map, order) => {
        map[order.id] = order.status;
        return map;
    }, {});
}

async function refreshTrackOrdersPage() {
    if (window.location.pathname !== '/track-orders') return;
    try {
        const html = await fetch('/track-orders', { cache: 'no-store' }).then(r => r.text());
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('main');
        const oldMain = document.querySelector('main');
        if (newMain && oldMain) {
            oldMain.replaceWith(newMain);
            initRating(newMain);
        }
    } catch (err) {
        console.error('Track orders refresh failed:', err);
    }
}

async function refreshManageOrdersPage() {
    if (window.location.pathname !== '/manage/orders') return;
    try {
        const html = await fetch('/manage/orders', { cache: 'no-store' }).then(r => r.text());
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('main');
        const oldMain = document.querySelector('main');
        if (newMain && oldMain) {
            oldMain.replaceWith(newMain);
        }
    } catch (err) {
        console.error('Manage orders refresh failed:', err);
    }
}

function initRating(container = document) {
    const ratingForms = container.querySelectorAll('.rating-form');
    ratingForms.forEach(form => {
        const stars = form.querySelectorAll('.star-btn');
        const input = form.querySelector('input[type="hidden"]');
        const submitBtn = form.querySelector('button[type="submit"]');

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const val = parseInt(star.dataset.value);
                stars.forEach(s => {
                    const sVal = parseInt(s.dataset.value);
                    if (sVal <= val) {
                        s.classList.replace('bi-star', 'bi-star-fill');
                        s.classList.add('text-warning');
                    } else {
                        s.classList.replace('bi-star-fill', 'bi-star');
                        s.classList.remove('text-warning');
                    }
                });
            });

            star.addEventListener('click', () => {
                const val = star.dataset.value;
                input.value = val;
                submitBtn.classList.remove('d-none');
                // Persist the selection
                stars.forEach(s => {
                    const sVal = parseInt(s.dataset.value);
                    if (sVal <= parseInt(val)) {
                        s.classList.replace('bi-star', 'bi-star-fill');
                        s.classList.add('text-warning');
                        s.setAttribute('data-selected', 'true');
                    } else {
                        s.classList.replace('bi-star-fill', 'bi-star');
                        s.classList.remove('text-warning');
                        s.removeAttribute('data-selected');
                    }
                });
            });
        });

        const starContainer = form.querySelector('.rating-stars');
        if (starContainer) {
            starContainer.addEventListener('mouseleave', () => {
                stars.forEach(s => {
                    if (s.hasAttribute('data-selected')) {
                        s.classList.replace('bi-star', 'bi-star-fill');
                        s.classList.add('text-warning');
                    } else {
                        s.classList.replace('bi-star-fill', 'bi-star');
                        s.classList.remove('text-warning');
                    }
                });
            });
        }
    });
}

function processNotificationPayload(data) {
    if (notificationState.role === null) {
        notificationState.role = data.role;
    }

    updateTrackOrdersBadge(data.hasPendingOrders);

    if (data.role === 'CUSTOMER' || data.role === 'GUEST') {
        const currentMap = buildOrderMap(data.orders || []);
        const changedOrders = [];
        Object.entries(currentMap).forEach(([orderId, status]) => {
            if (notificationState.orderStatusById[orderId] && notificationState.orderStatusById[orderId] !== status) {
                changedOrders.push({ orderId, status });
            }
        });

        if (notificationState.initialized && changedOrders.length > 0) {
            changedOrders.forEach(({ orderId, status }) => {
                showLiveNotification(`Η κατάσταση της παραγγελίας #${orderId} άλλαξε σε ${status}.`, 'success');
            });
            refreshTrackOrdersPage();
        }

        notificationState.orderStatusById = currentMap;
    }

    if (data.role === 'RESTAURANT') {
        const currentCount = data.pendingOrderCount || 0;
        if (notificationState.pendingOrderCount !== null && currentCount > notificationState.pendingOrderCount) {
            if (window.location.pathname.startsWith('/manage')) {
                showRestaurantNewOrderBanner();
            } else {
                showLiveNotification('Νέα παραγγελία έφτασε στο εστιατόριό σας!', 'success');
            }
            if (window.location.pathname === '/manage/orders') {
                refreshManageOrdersPage();
            }
        }
        notificationState.pendingOrderCount = currentCount;
    }

    notificationState.initialized = true;
}

async function refreshNotifications() {
    try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        processNotificationPayload(data);
    } catch (error) {
        console.error('Notification fallback poll failed:', error);
    }
}

function initNotificationStream() {
    if (!window.EventSource) {
        console.warn('EventSource not supported, falling back to polling.');
        refreshNotifications();
        setInterval(refreshNotifications, 8000);
        return;
    }

    const source = new EventSource('/api/notifications/stream');

    source.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            processNotificationPayload(data);
        } catch (err) {
            console.error('Invalid notification event data:', err);
        }
    };

    source.onerror = (err) => {
        console.error('Notification stream error:', err);
    };
}

initNotificationStream();

// ─── Leaflet map helper (from existing utils.js) ──────────────────────────────
function extractAddressParts(address = {}) {
    return {
        street: address.road || address.pedestrian || address.footway ||
                address.residential || address.path || '',
        number: address.house_number || address.housenumber || '',
        zipCode: (address.postcode || '').replace(/\s+/g, '')
    };
}

async function reverseGeocode(lat, lon) {
    try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        const data = await res.json();
        return data.address;
    } catch (err) {
        console.error('Reverse geocode failed:', err);
        return null;
    }
}

async function searchAddresses(query) {
    if (!query || query.trim().length < 3) return [];
    try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=gr&addressdetails=1&limit=5`);
        const data = await res.json();
        return data.map(item => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: item.address || {},
            parts: extractAddressParts(item.address || {})
        }));
    } catch (err) {
        console.error('Address search failed:', err);
        return [];
    }
}

async function geocodeAddress(street, number, zip) {
    const query = `${street} ${number}, ${zip}, Greece`;
    const results = await searchAddresses(query);
    return results.length > 0 ? { lat: results[0].lat, lon: results[0].lon } : null;
}

function initLeafletMap(containerId, onLocationSelected, options = {}) {
    const defaultLocation = options.defaultLocation || [38.2461, 21.7351]; // Patra (Plateia Georgiou)
    const map = L.map(containerId).setView(defaultLocation, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let marker = L.marker(defaultLocation, { draggable: true }).addTo(map);
    let searchResults = [];
    let debounceTimer = null;

    async function notify(lat, lon) {
        if (onLocationSelected) await onLocationSelected(lat, lon);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 16);
            marker.setLatLng([latitude, longitude]);
            await notify(latitude, longitude);
        }, () => {});
    }

    marker.on('dragend', async () => {
        const p = marker.getLatLng();
        await notify(p.lat, p.lng);
    });

    map.on('click', async e => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng]);
        await notify(e.latlng.lat, e.latlng.lng);
    });

    if (options.searchInputId && options.resultsContainerId) {
        const input = document.getElementById(options.searchInputId);
        const resultsEl = document.getElementById(options.resultsContainerId);

        const clearResults = () => { if (resultsEl) { resultsEl.innerHTML = ''; resultsEl.classList.add('d-none'); } };
        const renderResults = results => {
            if (!resultsEl) return;
            if (!results.length) {
                resultsEl.innerHTML = `<button type="button" class="list-group-item disabled">Δεν βρέθηκαν αποτελέσματα</button>`;
            } else {
                resultsEl.innerHTML = results.map((item, i) =>
                    `<button type="button" class="list-group-item list-group-item-action" data-idx="${i}">${item.displayName}</button>`
                ).join('');
                resultsEl.querySelectorAll('[data-idx]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const sel = searchResults[parseInt(btn.dataset.idx)];
                        if (!sel) return;
                        map.setView([sel.lat, sel.lon], 17);
                        marker.setLatLng([sel.lat, sel.lon]);
                        if (input) input.value = [sel.parts.street, sel.parts.number, sel.parts.zipCode].filter(Boolean).join(', ');
                        clearResults();
                        if (options.onAddressPicked) options.onAddressPicked(sel);
                        await notify(sel.lat, sel.lon);
                    });
                });
            }
            resultsEl.classList.remove('d-none');
        };

        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                const q = input.value.trim();
                if (q.length < 3) { clearResults(); return; }
                debounceTimer = setTimeout(async () => {
                    searchResults = await searchAddresses(q);
                    renderResults(searchResults);
                }, 350);
            });
            input.addEventListener('blur', () => setTimeout(clearResults, 200));
        }
    }

    setTimeout(() => map.invalidateSize(), 200);
    return { map, marker };
}

/**
 * Automatically fetch coordinates when address fields are filled manually.
 */
function initAutoGeocode(streetId, numberId, zipId, latId, lonId, formId) {
    const inputs = [streetId, numberId, zipId].map(id => document.getElementById(id)).filter(Boolean);
    const runGeocode = async () => {
        const street = document.getElementById(streetId)?.value;
        const number = document.getElementById(numberId)?.value;
        const zip = document.getElementById(zipId)?.value;
        if (street && number) {
            const coords = await geocodeAddress(street, number, zip);
            if (coords) {
                const latEl = document.getElementById(latId);
                const lonEl = document.getElementById(lonId);
                if (latEl) latEl.value = coords.lat;
                if (lonEl) lonEl.value = coords.lon;
            }
            return coords;
        }
        return null;
    };
    inputs.forEach(input => {
        input.addEventListener('blur', runGeocode);
        input.addEventListener('input', () => {
            const latEl = document.getElementById(latId);
            const lonEl = document.getElementById(lonId);
            if (latEl) latEl.value = '';
            if (lonEl) lonEl.value = '';
        });
    });

    if (formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                const latEl = document.getElementById(latId);
                const lonEl = document.getElementById(lonId);
                if (!latEl?.value || !lonEl?.value) {
                    e.preventDefault();
                    const btn = form.querySelector('button[type="submit"]');
                    if (btn) btn.disabled = true;
                    const coords = await runGeocode();
                    if (coords) {
                        form.submit();
                    } else {
                        if (btn) btn.disabled = false;
                        alert('Παρακαλούμε επιλέξτε την ακριβή τοποθεσία στο χάρτη ή βεβαιωθείτε ότι η διεύθυνση είναι σωστή.');
                    }
                }
            });
        }
    }
}

// ─── Hide/Show header on scroll ────────────────────────────────────────────────
(function() {
    const header = document.querySelector('.custom-header');
    if (!header) return;

    let lastScrollTop = 0;
    let scrollDelay = null;

    window.addEventListener('scroll', () => {
        if (scrollDelay) return;
        scrollDelay = setTimeout(() => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            // Scrolling down: hide header
            if (currentScroll > lastScrollTop && currentScroll > 60) {
                header.classList.add('header-hidden');
            } 
            // Scrolling up: show header
            else if (currentScroll < lastScrollTop) {
                header.classList.remove('header-hidden');
            }
            
            lastScrollTop = currentScroll;
            scrollDelay = null;
        }, 50);
    }, false);
})();

// ─── Cart Page Logic ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAutoGeocode('guestStreet', 'guestNumber', 'guestZip', 'cartLatitude', 'cartLongitude', 'checkoutForm');
    // Delete item from cart
    document.querySelectorAll('.btn-cart-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            if (!confirm('Διαγραφή προϊόντος από το καλάθι;')) return;
            const res = await fetch('/cart/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });
            if (res.ok) window.location.reload();
        });
    });

    // Change quantity in cart
    document.querySelectorAll('.btn-cart-qty').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            const delta = parseInt(btn.dataset.delta, 10);
            const name = btn.dataset.name;
            const price = parseFloat(btn.dataset.price);
            const restaurantId = parseInt(btn.dataset.restaurantId, 10);
            const endpoint = delta > 0 ? '/cart/add' : '/cart/remove';
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, name, price, restaurantId })
            });
            window.location.reload();
        });
    });

    // Submit Checkout form
    const btnSubmitCart = document.getElementById('btnSubmitCart');
    if (btnSubmitCart) {
        btnSubmitCart.addEventListener('click', () => {
            const checkoutForm = document.getElementById('checkoutForm');
            if (checkoutForm) checkoutForm.submit();
        });
    }

    // Toggle Cart Map
    const toggleCartMapBtn = document.getElementById('toggleCartMap');
    if (toggleCartMapBtn) {
        toggleCartMapBtn.addEventListener('click', function () {
            const container = document.getElementById('cartMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._cartMapInit) {
                window._cartMapInit = true;
                initLeafletMap('cartMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'guestStreet',
                        numberId: 'guestNumber',
                        zipId: 'guestZip'
                    });
                }, {
                    searchInputId: 'cartAddressSearch',
                    resultsContainerId: 'cartAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'guestStreet',
                            numberId: 'guestNumber',
                            zipId: 'guestZip'
                        });
                    }
                });
            }
        });
    }

    // Prefill floor and comments when selecting a saved address
    const radios = document.querySelectorAll('.address-radio');
    const floorInput = document.getElementById('selectedFloor');
    const commentsInput = document.getElementById('selectedComments');
    if (radios.length > 0 && floorInput && commentsInput) {
        const updateFields = () => {
            const selected = document.querySelector('.address-radio:checked');
            if (selected) {
                if (floorInput) floorInput.value = selected.dataset.floor || '';
                if (commentsInput) commentsInput.value = selected.dataset.comments || '';
                const phoneInput = document.getElementById('selectedPhone');
                if (phoneInput && !phoneInput.value && phoneInput.dataset.defaultPhone) {
                    phoneInput.value = phoneInput.dataset.defaultPhone;
                }
            }
        };
        radios.forEach(r => r.addEventListener('change', updateFields));
        updateFields();
    }
});

// ─── Restaurant Page Logic ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    function updateFloatingCartBar(cart) {
        const bar = document.getElementById('floatingCartBar');
        if (!bar) return;

        const totalCount = cart.reduce((s, i) => s + i.quantity, 0);
        const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);

        if (totalCount > 0) {
            const countEl = document.getElementById('floatingCartCount');
            const totalEl = document.getElementById('floatingCartTotal');
            const textEl = document.getElementById('floatingCartText');

            if (countEl) countEl.textContent = totalCount;
            if (totalEl) {
                totalEl.textContent = totalPrice.toFixed(2).replace('.', ',') + '€';
            }
            if (textEl) {
                const itemWord = totalCount === 1 ? 'προϊόν' : 'προϊόντα';
                textEl.innerHTML = `Έχεις <span id="floatingCartCount" class="fw-bold">${totalCount}</span> ${itemWord}`;
            }
            bar.classList.remove('d-none');
        } else {
            bar.classList.add('d-none');
        }
    }

    if (window.initialCart) {
        updateFloatingCartBar(window.initialCart);
    }

    // Restaurant change quantity
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-restaurant-qty');
        if (!btn) return;
        
        const productId = btn.dataset.productId;
        const delta = parseInt(btn.dataset.delta, 10);
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const restaurantId = parseInt(btn.dataset.restaurantId, 10);

        const endpoint = delta > 0 ? '/cart/add' : '/cart/remove';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, name, price, restaurantId })
        });

        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById('cartBadge');
            if (badge) badge.textContent = data.cartCount;

            const item = data.cart.find(i => i.productId == productId);
            const newQty = item ? item.quantity : 0;

            const container = document.getElementById(`actions-${productId}`);
            if (container) {
                if (newQty > 0) {
                    container.innerHTML = `
                    <div class="d-flex align-items-center justify-content-end gap-2 bg-white border border-2 border-secondary rounded-pill px-2 py-2 d-inline-flex shadow-sm line-height-1">
                        <button class="btn btn-danger btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center btn-circle-xs btn-restaurant-qty" data-product-id="${productId}" data-delta="-1" data-name="${name}" data-price="${price}" data-restaurant-id="${restaurantId}">−</button>
                        <span class="px-2 small fw-bold" id="qty-${productId}">${newQty}</span>
                        <button class="btn btn-success btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center btn-circle-xs btn-restaurant-qty" data-product-id="${productId}" data-delta="1" data-name="${name}" data-price="${price}" data-restaurant-id="${restaurantId}">+</button>
                    </div>
                `;
                } else {
                    container.innerHTML = `
                    <button class="btn btn-menu btn-sm px-3 fw-bold rounded-pill btn-restaurant-qty" data-product-id="${productId}" data-delta="1" data-name="${name}" data-price="${price}" data-restaurant-id="${restaurantId}">
                        + Προσθήκη
                    </button>
                `;
                }
            }

            // Update floating cart bar!
            updateFloatingCartBar(data.cart);
        } else {
            const data = await res.json();
            // Handle multi-restaurant conflict
            if (res.status === 400 && data.error && data.error.includes('μόνο ένα εστιατόριο')) {
                if (confirm('Το καλάθι σας περιέχει προϊόντα από άλλο εστιατόριο. Θέλετε να το αδειάσετε για να προσθέσετε αυτό το προϊόν;')) {
                    const clearRes = await fetch('/cart/clear', { method: 'POST' });
                    if (clearRes.ok) {
                        // Try adding again after clearing
                        const retryRes = await fetch('/cart/add', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productId, name, price, restaurantId })
                        });
                        if (retryRes.ok) {
                            window.location.reload(); // Reload to update UI across the page
                        }
                    }
                }
            } else {
                alert(data.error || 'Σφάλμα κατά την ενημέρωση του καλαθιού');
            }
        }
    });
});

// ─── Register Page Logic ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Toggle Password Visibility (used in register, login, etc)
    document.querySelectorAll('#togglePassword').forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            if (!passwordInput) return;
            const icon = this.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    });

    // Toggle Confirm Password Visibility
    document.querySelectorAll('#toggleConfirmPassword').forEach(btn => {
        btn.addEventListener('click', function() {
            const confirmInput = document.getElementById('confirmPassword');
            if (!confirmInput) return;
            const icon = this.querySelector('i');
            if (confirmInput.type === 'password') {
                confirmInput.type = 'text';
                icon.classList.replace('bi-eye', 'bi-eye-slash');
            } else {
                confirmInput.type = 'password';
                icon.classList.replace('bi-eye-slash', 'bi-eye');
            }
        });
    });


    initAutoGeocode('registerStreet', 'registerNumber', 'registerZip', 'registerLatitude', 'registerLongitude', 'registerForm');

    // Toggle Register Map
    const toggleRegisterMapBtn = document.getElementById('toggleRegisterMap');
    if (toggleRegisterMapBtn) {
        toggleRegisterMapBtn.addEventListener('click', function() {
            const container = document.getElementById('registerMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._regMapInit) {
                window._regMapInit = true;
                initLeafletMap('registerMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'registerStreet',
                        numberId: 'registerNumber',
                        zipId: 'registerZip'
                    });
                }, {
                    searchInputId: 'registerAddressSearch',
                    resultsContainerId: 'registerAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'registerStreet',
                            numberId: 'registerNumber',
                            zipId: 'registerZip'
                        });
                    }
                });
            }
        });
    }
});

// ─── Manage Restaurant Page Logic ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic (only on main management dashboard page)
    if (document.getElementById('section-profile')) {
        function switchManageTab(tabId) {
            // Hide all sections
            ['profile', 'menu', 'icon'].forEach(id => {
                const section = document.getElementById('section-' + id);
                if (section) section.classList.add('d-none');
                const nav = document.getElementById('nav-' + id);
                if (nav) nav.classList.remove('active');
            });

            // Show target section and set active
            const targetSection = document.getElementById('section-' + tabId);
            if (targetSection) targetSection.classList.remove('d-none');
            const targetNav = document.getElementById('nav-' + tabId);
            if (targetNav) targetNav.classList.add('active');
            
            // Save state
            sessionStorage.setItem('manageRestaurantActiveTab', tabId);
        }

        // Attach click events to nav tab buttons
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchManageTab(btn.dataset.tab);
            });
        });

        // Restore active tab on load
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab');
        if (urlTab && document.getElementById('nav-' + urlTab)) {
            switchManageTab(urlTab);
        } else {
            const activeTab = sessionStorage.getItem('manageRestaurantActiveTab');
            if (activeTab && document.getElementById('nav-' + activeTab)) {
                switchManageTab(activeTab);
            }
        }
    }

    // New Category Toggle
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryWrapper = document.getElementById('newCategoryWrapper');
    if (categorySelect && newCategoryWrapper) {
        categorySelect.addEventListener('change', () => {
            newCategoryWrapper.classList.toggle('d-none', categorySelect.value !== 'NEW');
        });
    }

    // Menu Table Search
    const menuSearch = document.getElementById('menuSearch');
    if (menuSearch) {
        menuSearch.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.product-row').forEach(row => {
                const nameEl = row.querySelector('.product-name');
                if (nameEl) {
                    const name = nameEl.textContent.toLowerCase();
                    row.style.display = name.includes(query) ? '' : 'none';
                }
            });
            // Hide category headers if all products under them are hidden
            document.querySelectorAll('.category-header').forEach(header => {
                let next = header.nextElementSibling;
                let hasVisible = false;
                while (next && !next.classList.contains('category-header')) {
                    if (next.style.display !== 'none') hasVisible = true;
                    next = next.nextElementSibling;
                }
                header.style.display = hasVisible ? '' : 'none';
            });
        });
    }

    // Reorder Logic
    document.querySelectorAll('.btn-reorder').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            const direction = parseInt(btn.dataset.dir, 10);
            
            const res = await fetch('/manage/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id, direction })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                alert('Σφάλμα κατά την αναδιάταξη.');
            }
        });
    });
});

// ─── Landing Page Logic ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAutoGeocode('landingStreet', 'landingNumber', 'landingZip', 'landingLatitude', 'landingLongitude', 'landingAddressForm');
    // Toggle Landing Map
    const toggleLandingMapBtn = document.getElementById('toggleLandingMap');
    if (toggleLandingMapBtn) {
        toggleLandingMapBtn.addEventListener('click', function () {
            const container = document.getElementById('landingMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._landingMapInit) {
                window._landingMapInit = true;
                const setLandingCoordinates = (lat, lon) => {
                    const latInput = document.getElementById('landingLatitude');
                    const lonInput = document.getElementById('landingLongitude');
                    if (latInput) latInput.value = lat;
                    if (lonInput) lonInput.value = lon;
                };

                initLeafletMap('landingMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'landingStreet',
                        numberId: 'landingNumber',
                        zipId: 'landingZip'
                    });
                    setLandingCoordinates(lat, lon);
                }, {
                    searchInputId: 'landingAddressSearch',
                    resultsContainerId: 'landingAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'landingStreet',
                            numberId: 'landingNumber',
                            zipId: 'landingZip'
                        });
                        setLandingCoordinates(selected.lat, selected.lon);
                    }
                });
            }
        });
    }
});

// ─── Browse Page Logic ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAutoGeocode('browseStreet', 'browseNumber', 'browseZip', 'browseLatitude', 'browseLongitude', 'browseNoAddressForm');
    initAutoGeocode('updateStreet', 'updateNumber', 'updateZip', 'updateLatitude', 'updateLongitude', 'browseGuestUpdateForm');
    // Toggle Update Map (for guests on browse page)
    const toggleUpdateMapBtn = document.getElementById('toggleUpdateMap');
    if (toggleUpdateMapBtn) {
        toggleUpdateMapBtn.addEventListener('click', function() {
            const container = document.getElementById('updateMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._updateMapInit) {
                window._updateMapInit = true;
                const setUpdateCoordinates = (lat, lon) => {
                    const latInput = document.getElementById('updateLatitude');
                    const lonInput = document.getElementById('updateLongitude');
                    if (latInput) latInput.value = lat;
                    if (lonInput) lonInput.value = lon;
                };

                initLeafletMap('updateMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'updateStreet',
                        numberId: 'updateNumber',
                        zipId: 'updateZip'
                    });
                    setUpdateCoordinates(lat, lon);
                }, {
                    searchInputId: 'updateAddressSearch',
                    resultsContainerId: 'updateAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'updateStreet',
                            numberId: 'updateNumber',
                            zipId: 'updateZip'
                        });
                        setUpdateCoordinates(selected.lat, selected.lon);
                    }
                });
            }
        });
    }

    // Toggle Browse Map
    const toggleBrowseMapBtn = document.getElementById('toggleBrowseMap');
    if (toggleBrowseMapBtn) {
        toggleBrowseMapBtn.addEventListener('click', function() {
            const container = document.getElementById('browseMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._browseMapInit) {
                window._browseMapInit = true;
                const setBrowseCoordinates = (lat, lon) => {
                    const latInput = document.getElementById('browseLatitude');
                    const lonInput = document.getElementById('browseLongitude');
                    if (latInput) latInput.value = lat;
                    if (lonInput) lonInput.value = lon;
                };

                initLeafletMap('browseMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'browseStreet',
                        numberId: 'browseNumber',
                        zipId: 'browseZip'
                    });
                    setBrowseCoordinates(lat, lon);
                }, {
                    defaultLocation: [38.2468, 21.7347],
                    searchInputId: 'browseAddressSearch',
                    resultsContainerId: 'browseAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'browseStreet',
                            numberId: 'browseNumber',
                            zipId: 'browseZip'
                        });
                        setBrowseCoordinates(selected.lat, selected.lon);
                    }
                });
            }
        });
    }

    // Toggle Guest Update Form
    document.querySelectorAll('.btn-toggle-guest-form').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = document.getElementById('guestUpdateForm');
            if (form) form.classList.toggle('d-none');
        });
    });

    // Toggle Cart Map (for guests on cart page)
    const toggleCartMapBtn = document.getElementById('toggleCartMap');
    if (toggleCartMapBtn) {
        toggleCartMapBtn.addEventListener('click', function() {
            const container = document.getElementById('cartMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._cartMapInit) {
                window._cartMapInit = true;
                const setCartCoordinates = (lat, lon) => {
                    const latInput = document.getElementById('cartLatitude');
                    const lonInput = document.getElementById('cartLongitude');
                    if (latInput) latInput.value = lat;
                    if (lonInput) lonInput.value = lon;
                };

                initLeafletMap('cartMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'guestStreet',
                        numberId: 'guestNumber',
                        zipId: 'guestZip'
                    });
                    setCartCoordinates(lat, lon);
                }, {
                    searchInputId: 'cartAddressSearch',
                    resultsContainerId: 'cartAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'guestStreet',
                            numberId: 'guestNumber',
                            zipId: 'guestZip'
                        });
                        setCartCoordinates(selected.lat, selected.lon);
                    }
                });
            }
        });
    }

    // Category selection & filtering
    let selectedCategory = 'all';

    function applyFilters() {
        const searchInput = document.getElementById('searchRestaurant');
        const query = searchInput ? searchInput.value.trim() : '';
        
        const url = new URL(window.location.href);
        // reset to page 1 on filter change
        url.searchParams.delete('page');
        
        if (selectedCategory && selectedCategory !== 'all') {
            url.searchParams.set('category', selectedCategory);
        } else {
            url.searchParams.delete('category');
        }
        
        if (query) {
            url.searchParams.set('search', query);
        } else {
            url.searchParams.delete('search');
        }
        
        window.location.href = url.toString();
    }

    document.querySelectorAll('.btn-select-category').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('active')) {
                if (selectedCategory !== 'all') {
                    selectedCategory = 'all';
                    applyFilters();
                }
            } else {
                selectedCategory = this.getAttribute('data-category');
                applyFilters();
            }
        });
    });

    const searchRestaurant = document.getElementById('searchRestaurant');
    if (searchRestaurant) {
        searchRestaurant.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    document.querySelectorAll('.btn-filter-restaurants').forEach(btn => {
        btn.addEventListener('click', applyFilters);
    });

    // Horizontal scroll for categories
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const categoryScroll = document.querySelector('.category-scroll');
    
    if (scrollLeftBtn && scrollRightBtn && categoryScroll) {
        scrollLeftBtn.addEventListener('click', () => {
            categoryScroll.scrollBy({ left: -200, behavior: 'smooth' });
        });
        scrollRightBtn.addEventListener('click', () => {
            categoryScroll.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }
});

// ─── Generic Handlers ───────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
    const confirmBtn = e.target.closest('.btn-confirm');
    if (confirmBtn) {
        const msg = confirmBtn.getAttribute('data-confirm') || 'Είστε σίγουροι;';
        if (!confirm(msg)) {
            e.preventDefault();
        }
    }
});

// ─── Account Page Logic ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAutoGeocode('accountStreet', 'accountNumber', 'accountZip', 'accountLatitude', 'accountLongitude', 'addAddressForm');
    initAutoGeocode('editStreet', 'editNumber', 'editZip', 'editLatitude', 'editLongitude', 'editAddressForm');
    // 1. Edit Address Flow
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.edit-address-btn');
        if (btn) {
            const id = btn.dataset.id;
            const form = document.getElementById('editAddressForm');
            if (!form) return;
            form.action = `/account/addresses/${id}/edit`;
            
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            
            setVal('editStreet', btn.dataset.street || '');
            setVal('editNumber', btn.dataset.number || '');
            setVal('editZip', btn.dataset.zip || '');
            setVal('editFloor', btn.dataset.floor || '');
            setVal('editComments', btn.dataset.comments || '');
            setVal('editLatitude', btn.dataset.lat || '');
            setVal('editLongitude', btn.dataset.lon || '');
            
            const modalEl = document.getElementById('editAddressModal');
            if (modalEl && window.bootstrap) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        }
    });

    // 2. Map Toggle
    const toggleAccountMapBtn = document.getElementById('toggleAccountMap');
    if (toggleAccountMapBtn) {
        toggleAccountMapBtn.addEventListener('click', function() {
            const container = document.getElementById('accountMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._accMapInit) {
                window._accMapInit = true;
                const setAccountCoordinates = (lat, lon) => {
                    const latInput = document.getElementById('accountLatitude');
                    const lonInput = document.getElementById('accountLongitude');
                    if (latInput) latInput.value = lat;
                    if (lonInput) lonInput.value = lon;
                };

                initLeafletMap('accountMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'accountStreet',
                        numberId: 'accountNumber',
                        zipId: 'accountZip'
                    });
                    setAccountCoordinates(lat, lon);
                }, {
                    searchInputId: 'accountAddressSearch',
                    resultsContainerId: 'accountAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'accountStreet',
                            numberId: 'accountNumber',
                            zipId: 'accountZip'
                        });
                        setAccountCoordinates(selected.lat, selected.lon);
                    }
                });
            }
        });
    }

    // 3. Star Rating Logic
    initRating();
});
