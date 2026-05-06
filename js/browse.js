// ─── browse.js ───────────────────────────────────────────────────
// Handles browse page: address picker accordion, inline add-address forms

document.addEventListener('DOMContentLoaded', async () => {
    await renderBrowsePage();
});

let browseLat = null;
let browseLon = null;

async function renderBrowsePage() {
    const browseAddressAccordion = document.getElementById('browseAddressAccordion');
    if (!browseAddressAccordion) return;

    // Prevent duplicate event listeners
    if (browseAddressAccordion.dataset.wired) return;
    browseAddressAccordion.dataset.wired = '1';

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const guestAddress = localStorage.getItem('guestAddress')?.trim();

    if (user) {
        try {
            const addressesData = await getUserAddresses();
            const addresses = addressesData.map(addr => `${addr.street} ${addr.street_number}`);
            renderBrowsePageWithAddresses(addresses, user, guestAddress);
        } catch (error) {
            console.error('Failed to load addresses:', error);
            renderBrowsePageWithAddresses([], user, guestAddress);
        }
    } else {
        const addresses = guestAddress ? [guestAddress] : [];
        renderBrowsePageWithAddresses(addresses, user, guestAddress);
    }
}

function renderBrowsePageWithAddresses(addresses, user, guestAddress) {
    const noAddressSection = document.getElementById('noAddressSection');
    const browseAddressAccordion = document.getElementById('browseAddressAccordion');
    const restaurantSection = document.getElementById('restaurantSection');
    const browseAddressList = document.getElementById('browseAddressList');

    if (addresses.length === 0) {
        if (noAddressSection) noAddressSection.classList.remove('d-none');
        browseAddressAccordion.classList.add('d-none');
        if (restaurantSection) restaurantSection.classList.add('d-none');

        const firstSaveBtn = document.getElementById('browseFirstSaveAddress');
        const toggleMapBtn = document.getElementById('browseToggleFirstMap');
        
        if (firstSaveBtn && !browseAddressAccordion.dataset.wireFirst) {
            browseAddressAccordion.dataset.wireFirst = '1';
            let firstMapObj = null;

            if (toggleMapBtn) {
                toggleMapBtn.addEventListener('click', () => {
                    const mapDiv = document.getElementById('browseFirstMapContainer');
                    if (mapDiv) {
                        mapDiv.classList.toggle('d-none');
                        if (!mapDiv.classList.contains('d-none')) {
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
                            } else {
                                setTimeout(() => firstMapObj.map.invalidateSize(), 100);
                            }
                        }
                    }
                });
            }

            firstSaveBtn.addEventListener('click', async () => {
                const street = document.getElementById('browseFirstStreet').value.trim();
                const number = document.getElementById('browseFirstNumber').value.trim();
                const zip = document.getElementById('browseFirstZipCode')?.value.trim() ?? '';
                console.log('First save button clicked. Street:', street, 'Number:', number, 'Zip:', zip, 'User:', user);
                if (!street || !number) {
                    alert('Παρακαλώ συμπληρώστε οδό και αριθμό.');
                    return;
                }

                if (user) {
                    console.log('Attempting to add address for logged-in user');
                    try {
                        const success = await addAddressToUser(street, number, zip, browseLat, browseLon);
                        console.log('API response success:', success);
                        if (success) {
                            location.reload();
                        } else {
                            alert('Σφάλμα κατά την αποθήκευση.');
                        }
                    } catch (error) {
                        console.error('Error adding address:', error);
                        alert('Σφάλμα: ' + error.message);
                    }
                } else {
                    console.log('User is not logged in, saving to localStorage');
                    localStorage.setItem('guestAddress', `${street} ${number}, ${zip}`.trim().replace(/,$/, ''));
                    if (browseLat) localStorage.setItem('guestLat', browseLat);
                    if (browseLon) localStorage.setItem('guestLon', browseLon);
                    location.reload();
                }
            });
        }
        return;
    }

    // Has addresses
    if (noAddressSection) noAddressSection.classList.add('d-none');
    browseAddressAccordion.classList.remove('d-none');
    if (restaurantSection) restaurantSection.classList.remove('d-none');

    const accordionButton = document.querySelector('#browseAddressHeading .accordion-button');
    const addressCollapse = document.getElementById('browseAddressCollapse');
    
    if (browseAddressList) {
        browseAddressList.innerHTML = addresses.map((addrLabel, i) => `
            <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                ${i === 0 ? 'aria-current="true"' : ''}>${addrLabel}</button>
        `).join('');

        const allBtns = browseAddressList.querySelectorAll('button');
        allBtns.forEach(btn => btn.addEventListener('click', () => {
            allBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (accordionButton) accordionButton.textContent = btn.textContent.trim();
            if (addressCollapse) {
                const bsCollapse = bootstrap.Collapse.getInstance(addressCollapse) || new bootstrap.Collapse(addressCollapse, { toggle: false });
                bsCollapse.hide();
            }
        }));

        if (accordionButton && addresses.length > 0) {
            accordionButton.textContent = addresses[0];
        }
    }

    const toggleBtn = document.getElementById('browseToggleAddForm');
    const inlineForm = document.getElementById('browseInlineAddressForm');
    const saveBtn = document.getElementById('browseSaveAddress');
    let inlineMapObj = null;

    if (toggleBtn && inlineForm && !browseAddressAccordion.dataset.wireMapped) {
        browseAddressAccordion.dataset.wireMapped = '1';

        if (user) {
            toggleBtn.addEventListener('click', () => {
                console.log('Toggle button clicked! Current state - form hidden:', inlineForm.classList.contains('d-none'));
                inlineForm.classList.toggle('d-none');
                if (!inlineForm.classList.contains('d-none')) {
                    if (!inlineMapObj) {
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
                    } else {
                        setTimeout(() => inlineMapObj.map.invalidateSize(), 100);
                    }
                }
            });

            if (saveBtn) {
                saveBtn.addEventListener('click', async () => {
                    const street = document.getElementById('browseNewStreet').value.trim();
                    const number = document.getElementById('browseNewNumber').value.trim();
                    const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                    console.log('Save button clicked. Street:', street, 'Number:', number, 'Zip:', zip);
                    if (!street || !number) {
                        alert('Παρακαλώ συμπληρώστε οδό και αριθμό.');
                        return;
                    }
                    try {
                        console.log('Calling addAddressToUser with:', street, number, zip, browseLat, browseLon);
                        const success = await addAddressToUser(street, number, zip, browseLat, browseLon);
                        console.log('addAddressToUser returned:', success);
                        if (success) {
                            console.log('Success! Clearing inline form and reloading...');
                            // Clear the form
                            document.getElementById('browseNewStreet').value = '';
                            document.getElementById('browseNewNumber').value = '';
                            document.getElementById('browseNewZipCode').value = '';
                            
                            // Wait a moment to ensure DB is updated, then reload
                            setTimeout(() => {
                                console.log('Reloading page to refresh addresses...');
                                location.reload();
                            }, 300);
                        } else {
                            alert('Σφάλμα κατά την αποθήκευση.');
                        }
                    } catch (error) {
                        console.error('Error in saveBtn click:', error);
                        alert('Σφάλμα: ' + error.message);
                    }
                });
            } else {
                console.log('saveBtn does NOT exist!');
            }
        } else {
            toggleBtn.addEventListener('click', () => {
                inlineForm.classList.toggle('d-none');
                if (!inlineForm.classList.contains('d-none') && !inlineMapObj) {
                    inlineMapObj = initLeafletMap('browseInlineMap', async (lat, lon) => {
                        browseLat = lat; browseLon = lon;
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
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    const street = document.getElementById('browseNewStreet').value.trim();
                    const number = document.getElementById('browseNewNumber').value.trim();
                    const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                    if (!street || !number) return;
                    localStorage.setItem('guestAddress', `${street} ${number}, ${zip}`.trim().replace(/,$/, ''));
                    if (browseLat) localStorage.setItem('guestLat', browseLat);
                    if (browseLon) localStorage.setItem('guestLon', browseLon);
                    location.reload();
                });
            }
        }
    }
}
