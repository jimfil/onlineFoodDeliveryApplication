/**
 * utils.js — Client-side utilities for LogoFood
 * Includes Leaflet map initialization, Geocoding, and address helpers.
 */

/**
 * Reverse Geocoding using Nominatim (OpenStreetMap)
 */
async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        const data = await response.json();
        return data.address;
    } catch (error) {
        console.error('Reverse Geocoding failed:', error);
        return null;
    }
}

/**
 * Address search using Nominatim
 */
async function searchAddresses(query) {
    try {
        if (!query || query.trim().length < 3) return [];
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=gr&addressdetails=1&limit=5`
        );
        const data = await response.json();
        return data.map(item => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: item.address || {},
            parts: extractAddressParts(item.address || {})
        }));
    } catch (error) {
        console.error('Address search failed:', error);
        return [];
    }
}

/**
 * Extract street, number, zip from Nominatim address object
 */
function extractAddressParts(address = {}) {
    return {
        street: address.road || address.pedestrian || address.footway || address.residential || address.path || '',
        number: address.house_number || address.housenumber || '',
        zipCode: address.postcode || ''
    };
}

/**
 * Helper to fill input fields with address parts
 */
function fillAddressFields(address, fieldIds) {
    if (!fieldIds) return;
    const parts = extractAddressParts(address);
    if (fieldIds.streetId) {
        const el = document.getElementById(fieldIds.streetId);
        if (el) el.value = parts.street;
    }
    if (fieldIds.numberId) {
        const el = document.getElementById(fieldIds.numberId);
        if (el) el.value = parts.number;
    }
    if (fieldIds.zipId) {
        const el = document.getElementById(fieldIds.zipId);
        if (el) el.value = parts.zipCode;
    }
    return parts;
}

/**
 * Initialize Leaflet Map with draggable marker and optional autocomplete
 */
function initLeafletMap(containerId, onLocationSelected, options = {}) {
    const defaultLocation = [37.9755, 23.7348]; // Athens
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

    // Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const latlng = [latitude, longitude];
            map.setView(latlng, 16);
            marker.setLatLng(latlng);
            await notify(latitude, longitude);
        }, () => console.warn('Geolocation denied.'));
    }

    marker.on('dragend', async () => {
        const p = marker.getLatLng();
        await notify(p.lat, p.lng);
    });

    map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        await notify(e.latlng.lat, e.latlng.lng);
    });

    // Autocomplete support
    if (options.searchInputId && options.resultsContainerId) {
        const input = document.getElementById(options.searchInputId);
        const resultsBox = document.getElementById(options.resultsContainerId);

        const clear = () => {
            if (resultsBox) {
                resultsBox.innerHTML = '';
                resultsBox.classList.add('d-none');
            }
        };

        input?.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const q = input.value.trim();
            if (q.length < 3) return clear();
            
            debounceTimer = setTimeout(async () => {
                searchResults = await searchAddresses(q);
                if (resultsBox) {
                    resultsBox.innerHTML = searchResults.map((item, i) => `
                        <button type="button" class="list-group-item list-group-item-action" data-idx="${i}">
                            ${item.displayName}
                        </button>
                    `).join('');
                    resultsBox.classList.remove('d-none');
                    
                    resultsBox.querySelectorAll('[data-idx]').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const sel = searchResults[btn.dataset.idx];
                            map.setView([sel.lat, sel.lon], 17);
                            marker.setLatLng([sel.lat, sel.lon]);
                            clear();
                            if (options.onAddressPicked) options.onAddressPicked(sel);
                            await notify(sel.lat, sel.lon);
                        });
                    });
                }
            }, 400);
        });

        input?.addEventListener('blur', () => setTimeout(clear, 200));
    }

    setTimeout(() => map.invalidateSize(), 200);
    return { map, marker };
}
