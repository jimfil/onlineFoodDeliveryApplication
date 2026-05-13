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

function initLeafletMap(containerId, onLocationSelected, options = {}) {
    const defaultLocation = [37.9755, 23.7348];
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
            const endpoint = delta > 0 ? '/cart/add' : '/cart/remove';
            await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
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
    // Tab Switching Logic
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
    const activeTab = sessionStorage.getItem('manageRestaurantActiveTab');
    if (activeTab && document.getElementById('nav-' + activeTab)) {
        switchManageTab(activeTab);
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
    // Toggle Landing Map
    const toggleLandingMapBtn = document.getElementById('toggleLandingMap');
    if (toggleLandingMapBtn) {
        toggleLandingMapBtn.addEventListener('click', function () {
            const container = document.getElementById('landingMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._landingMapInit) {
                window._landingMapInit = true;
                initLeafletMap('landingMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'landingStreet',
                        numberId: 'landingNumber',
                        zipId: 'landingZip'
                    });
                }, {
                    searchInputId: 'landingAddressSearch',
                    resultsContainerId: 'landingAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'landingStreet',
                            numberId: 'landingNumber',
                            zipId: 'landingZip'
                        });
                    }
                });
            }
        });
    }
});

// ─── Browse Page Logic ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Toggle Update Map (for guests on browse page)
    const toggleUpdateMapBtn = document.getElementById('toggleUpdateMap');
    if (toggleUpdateMapBtn) {
        toggleUpdateMapBtn.addEventListener('click', function() {
            const container = document.getElementById('updateMapContainer');
            if (!container) return;
            container.classList.toggle('d-none');
            if (!container.classList.contains('d-none') && !window._updateMapInit) {
                window._updateMapInit = true;
                initLeafletMap('updateMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'updateStreet',
                        numberId: 'updateNumber',
                        zipId: 'updateZip'
                    });
                }, {
                    searchInputId: 'updateAddressSearch',
                    resultsContainerId: 'updateAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'updateStreet',
                            numberId: 'updateNumber',
                            zipId: 'updateZip'
                        });
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
                initLeafletMap('browseMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'browseStreet',
                        numberId: 'browseNumber',
                        zipId: 'browseZip'
                    });
                }, {
                    searchInputId: 'browseAddressSearch',
                    resultsContainerId: 'browseAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'browseStreet',
                            numberId: 'browseNumber',
                            zipId: 'browseZip'
                        });
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

    // Category selection & filtering
    let selectedCategory = 'all';

    function filterRestaurants() {
        const searchInput = document.getElementById('searchRestaurant');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const wrappers = document.querySelectorAll('.restaurant-card-wrapper');
        let visibleCount = 0;

        wrappers.forEach(wrapper => {
            const nameEl = wrapper.querySelector('.card-title');
            if (!nameEl) return;
            const name = nameEl.textContent.toLowerCase();
            const categories = wrapper.getAttribute('data-categories').toLowerCase().split(',');
            
            const matchesQuery = name.includes(query) || categories.some(cat => cat.includes(query));
            const matchesCategory = selectedCategory === 'all' || categories.includes(selectedCategory.toLowerCase());
            
            if (matchesQuery && matchesCategory) {
                wrapper.style.display = '';
                visibleCount++;
            } else {
                wrapper.style.display = 'none';
            }
        });

        // Handle no results message
        const restaurantList = document.getElementById('restaurantList');
        let noResults = document.getElementById('noResultsMessage');
        if (visibleCount === 0 && wrappers.length > 0 && restaurantList) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'noResultsMessage';
                noResults.className = 'col-12 text-center py-5';
                noResults.innerHTML = '<p class="text-muted">Δεν βρέθηκαν εστιατόρια που να ταιριάζουν με τα κριτήρια σας.</p>';
                restaurantList.appendChild(noResults);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    document.querySelectorAll('.btn-select-category').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('active')) {
                if (selectedCategory !== 'all') {
                    document.querySelectorAll('.btn-select-category').forEach(b => b.classList.remove('active'));
                    const allBtn = document.querySelector('.btn-select-category[data-category="all"]');
                    if (allBtn) allBtn.classList.add('active');
                    selectedCategory = 'all';
                }
            } else {
                document.querySelectorAll('.btn-select-category').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedCategory = this.getAttribute('data-category');
            }
            filterRestaurants();
        });
    });

    const searchRestaurant = document.getElementById('searchRestaurant');
    if (searchRestaurant) {
        searchRestaurant.addEventListener('input', filterRestaurants);
    }
    document.querySelectorAll('.btn-filter-restaurants').forEach(btn => {
        btn.addEventListener('click', filterRestaurants);
    });
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
                initLeafletMap('accountMap', async (lat, lon) => {
                    const addr = await reverseGeocode(lat, lon);
                    fillAddressFields(addr, {
                        streetId: 'accountStreet',
                        numberId: 'accountNumber',
                        zipId: 'accountZip'
                    });
                }, {
                    searchInputId: 'accountAddressSearch',
                    resultsContainerId: 'accountAddressResults',
                    onAddressPicked: (selected) => {
                        fillAddressFields(selected.address, {
                            streetId: 'accountStreet',
                            numberId: 'accountNumber',
                            zipId: 'accountZip'
                        });
                    }
                });
            }
        });
    }

    // 3. Star Rating Logic
    const ratingForms = document.querySelectorAll('.rating-form');
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
});
