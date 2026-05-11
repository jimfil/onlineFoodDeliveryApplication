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
        zipCode: address.postcode || ''
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
