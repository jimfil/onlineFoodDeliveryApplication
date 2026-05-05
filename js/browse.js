// ─── browse.js ───────────────────────────────────────────────────
// Handles browse page: address picker accordion, inline add-address forms

document.addEventListener('DOMContentLoaded', () => {
    renderBrowsePage();
});

function renderBrowsePage() {
    const noAddressSection = document.getElementById('noAddressSection');
    const browseAddressAccordion = document.getElementById('browseAddressAccordion');
    const restaurantSection = document.getElementById('restaurantSection');
    const browseAddressList = document.getElementById('browseAddressList');

    if (!browseAddressAccordion) return;

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const guestAddress = localStorage.getItem('guestAddress')?.trim();

    // Load addresses from backend if user is logged in
    if (user) {
        getUserAddresses().then(addressesData => {
            const addresses = addressesData.map(addr => `${addr.street} ${addr.street_number}`);
            renderBrowsePageWithAddresses(addresses, user, guestAddress);
        }).catch(error => {
            console.error('Failed to load addresses:', error);
            // Fallback to localStorage
            let addresses = user.addresses || [];
            if (addresses.length === 0 && user.address) addresses.push(user.address);
            renderBrowsePageWithAddresses(addresses, user, guestAddress);
        });
    } else {
        let addresses = [];
        if (guestAddress) addresses.push(guestAddress);
        renderBrowsePageWithAddresses(addresses, user, guestAddress);
    }
}

function renderBrowsePageWithAddresses(addresses, user, guestAddress) {

    let browseLat = null;
    let browseLon = null;

    function showAccordion() {
        if (noAddressSection) noAddressSection.classList.add('d-none');
        browseAddressAccordion.classList.remove('d-none');

        const accordionButton = document.querySelector('#browseAddressHeading .accordion-button');
        const addressCollapse = document.getElementById('browseAddressCollapse');
        const bsCollapse = new bootstrap.Collapse(addressCollapse, { toggle: false });

        // Use the addresses passed to this function
        browseAddressList.innerHTML = addresses.map((addr, i) => `
            <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                ${i === 0 ? 'aria-current="true"' : ''}>${addr}</button>
        `).join('');

        if (accordionButton && addresses.length > 0) accordionButton.textContent = addresses[0];
        if (restaurantSection && addresses.length > 0) restaurantSection.classList.remove('d-none');

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

        // Inline add form inside accordion
        const toggleBtn = document.getElementById('browseToggleAddForm');
        const inlineForm = document.getElementById('browseInlineAddressForm');
        const saveBtn = document.getElementById('browseSaveAddress');
        let inlineMapObj = null;

        if (user) {
            // Logged in user: Can add new addresses
            if (toggleBtn && inlineForm && !toggleBtn.dataset.wired) {
                toggleBtn.dataset.wired = '1';
                toggleBtn.addEventListener('click', () => {
                    inlineForm.classList.toggle('d-none');
                    if (!inlineForm.classList.contains('d-none') && !inlineMapObj) {
                        inlineMapObj = initLeafletMap('browseInlineMap', async (lat, lon) => {
                            browseLat = lat;
                            browseLon = lon;
                            const addr = await reverseGeocode(lat, lon);
                            if (addr) {
                                if (addr.road) document.getElementById('browseNewStreet').value = addr.road;
                                if (addr.house_number) document.getElementById('browseNewNumber').value = addr.house_number;
                                if (addr.postcode) document.getElementById('browseNewZipCode').value = addr.postcode;
                            }
                        });
                    } else if (inlineMapObj) {
                        setTimeout(() => inlineMapObj.map.invalidateSize(), 100);
                    }
                });

                saveBtn.addEventListener('click', async () => {
                    const street = document.getElementById('browseNewStreet').value.trim();
                    const number = document.getElementById('browseNewNumber').value.trim();
                    const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                    if (!street || !number) return;
                    try {
                        await addAddressToUser(street, number, zip, browseLat, browseLon);
                        document.getElementById('browseNewStreet').value = '';
                        document.getElementById('browseNewNumber').value = '';
                        if (document.getElementById('browseNewZipCode')) document.getElementById('browseNewZipCode').value = '';
                        inlineForm.classList.add('d-none');
                        renderBrowsePage(); // Refresh
                    } catch (error) {
                        alert('Failed to add address: ' + error.message);
                    }
                });
            }
        } else {
            // Guest: Only "Edit/Change" the single guest address
            if (toggleBtn) {
                toggleBtn.textContent = '✎ Αλλαγή διεύθυνσης';
                if (!toggleBtn.dataset.wired) {
                    toggleBtn.dataset.wired = '1';
                    toggleBtn.addEventListener('click', () => {
                        inlineForm.classList.toggle('d-none');
                        if (!inlineForm.classList.contains('d-none') && !inlineMapObj) {
                            inlineMapObj = initLeafletMap('browseInlineMap', async (lat, lon) => {
                                browseLat = lat;
                                browseLon = lon;
                                const addr = await reverseGeocode(lat, lon);
                                if (addr) {
                                    if (addr.road) document.getElementById('browseNewStreet').value = addr.road;
                                    if (addr.house_number) document.getElementById('browseNewNumber').value = addr.house_number;
                                    if (addr.postcode) document.getElementById('browseNewZipCode').value = addr.postcode;
                                }
                            });
                        } else if (inlineMapObj) {
                            setTimeout(() => inlineMapObj.map.invalidateSize(), 100);
                        }
                    });

                    saveBtn.textContent = 'Ενημέρωση διεύθυνσης';
                    saveBtn.addEventListener('click', () => {
                        const street = document.getElementById('browseNewStreet').value.trim();
                        const number = document.getElementById('browseNewNumber').value.trim();
                        const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                        if (!street || !number) return;

                        const full = `${street} ${number}, ${zip}`;
                        localStorage.setItem('guestAddress', full);
                        if (browseLat) localStorage.setItem('guestLat', browseLat);
                        if (browseLon) localStorage.setItem('guestLon', browseLon);
                        
                        inlineForm.classList.add('d-none');
                        renderBrowsePage(); // Refresh
                    });
                }
            }
        }
    }

    if (addresses.length === 0) {
        if (noAddressSection) noAddressSection.classList.remove('d-none');
        browseAddressAccordion.classList.add('d-none');
        if (restaurantSection) restaurantSection.classList.add('d-none');

        let firstMapObj = null;
        const firstSaveBtn = document.getElementById('browseFirstSaveAddress');
        if (firstSaveBtn && !firstSaveBtn.dataset.wired) {
            firstSaveBtn.dataset.wired = '1';
            
            // Init map for first address
            setTimeout(() => {
                if (!firstMapObj) {
                    firstMapObj = initLeafletMap('browseFirstMap', async (lat, lon) => {
                        browseLat = lat;
                        browseLon = lon;
                        const addr = await reverseGeocode(lat, lon);
                        if (addr) {
                            if (addr.road) document.getElementById('browseFirstStreet').value = addr.road;
                            if (addr.house_number) document.getElementById('browseFirstNumber').value = addr.house_number;
                            if (addr.postcode) document.getElementById('browseFirstZipCode').value = addr.postcode;
                        }
                    });
                }
            }, 100);

            firstSaveBtn.addEventListener('click', async () => {
                const street = document.getElementById('browseFirstStreet').value.trim();
                const number = document.getElementById('browseFirstNumber').value.trim();
                const zip = document.getElementById('browseFirstZipCode')?.value.trim() ?? '';
                if (!street || !number) return;

                if (user) {
                    try {
                        await addAddressToUser(street, number, zip, browseLat, browseLon);
                        renderBrowsePage();
                    } catch (error) {
                        alert('Failed to add address: ' + error.message);
                    }
                } else {
                    const full = `${street} ${number}, ${zip}`;
                    localStorage.setItem('guestAddress', full);
                    if (browseLat) localStorage.setItem('guestLat', browseLat);
                    if (browseLon) localStorage.setItem('guestLon', browseLon);
                    renderBrowsePage();
                }
            });
        }
        return;
    }

    showAccordion();
}
