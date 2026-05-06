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
                    if (!mapDiv) return;

                    const isHidden = mapDiv.classList.contains('d-none');
                    mapDiv.classList.toggle('d-none');

                    if (isHidden) {
                    setTimeout(() => {
                        document.getElementById('browseFirstAddressSearch')?.focus();
                    }, 150);
                    }

                    if (isHidden && !firstMapObj) {
                    firstMapObj = initLeafletMap(
                        'browseFirstMap',
                        async (lat, lon) => {
                        browseLat = lat;
                        browseLon = lon;

                        const addr = await reverseGeocode(lat, lon);
                        fillAddressFields(addr, {
                            streetId: 'browseFirstStreet',
                            numberId: 'browseFirstNumber',
                            zipId: 'browseFirstZipCode'
                        });
                        },
                        {
                        searchInputId: 'browseFirstAddressSearch',
                        resultsContainerId: 'browseFirstAddressResults',
                        onAddressPicked: (selected) => {
                            browseLat = selected.lat;
                            browseLon = selected.lon;

                            fillAddressFields(selected.address, {
                            streetId: 'browseFirstStreet',
                            numberId: 'browseFirstNumber',
                            zipId: 'browseFirstZipCode'
                            });
                        }
                        }
                    );
                    } else if (firstMapObj) {
                    setTimeout(() => firstMapObj.map.invalidateSize(), 100);
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

    if (!user && toggleBtn) {
        toggleBtn.textContent = 'Αλλαγή διεύθυνσης';
    }

    if (toggleBtn && inlineForm && !browseAddressAccordion.dataset.wireMapped) {
        browseAddressAccordion.dataset.wireMapped = '1';

        toggleBtn.addEventListener('click', () => {
            inlineForm.classList.toggle('d-none');
        });

        const toggleBrowseMap = document.getElementById('toggleBrowseMap');
        const browseMapContainer = document.getElementById('browseMapContainer');

        if (toggleBrowseMap && browseMapContainer && !toggleBrowseMap.dataset.wired) {
            toggleBrowseMap.dataset.wired = '1';

            toggleBrowseMap.addEventListener('click', () => {
                const isHidden = browseMapContainer.classList.contains('d-none');
                browseMapContainer.classList.toggle('d-none');

                if (isHidden) {
                    setTimeout(() => {
                        document.getElementById('browseAddressSearch')?.focus();
                    }, 150);
                }

                if (isHidden && !inlineMapObj) {
                    inlineMapObj = initLeafletMap(
                        'browseMap',
                        async (lat, lon) => {
                            browseLat = lat;
                            browseLon = lon;

                            const addr = await reverseGeocode(lat, lon);
                            fillAddressFields(addr, {
                                streetId: 'browseNewStreet',
                                numberId: 'browseNewNumber',
                                zipId: 'browseNewZipCode'
                            });
                        },
                        {
                            searchInputId: 'browseAddressSearch',
                            resultsContainerId: 'browseAddressResults',
                            onAddressPicked: (selected) => {
                                browseLat = selected.lat;
                                browseLon = selected.lon;

                                fillAddressFields(selected.address, {
                                    streetId: 'browseNewStreet',
                                    numberId: 'browseNewNumber',
                                    zipId: 'browseNewZipCode'
                                });
                            }
                        }
                    );
                } else if (inlineMapObj) {
                    setTimeout(() => inlineMapObj.map.invalidateSize(), 100);
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const street = document.getElementById('browseNewStreet').value.trim();
                const number = document.getElementById('browseNewNumber').value.trim();
                const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                
                if (!street || !number) {
                    alert('Παρακαλώ συμπληρώστε οδό και αριθμό.');
                    return;
                }

                if (user) {
                    try {
                        const success = await addAddressToUser(street, number, zip, browseLat, browseLon);
                        if (success) {
                            document.getElementById('browseNewStreet').value = '';
                            document.getElementById('browseNewNumber').value = '';
                            document.getElementById('browseNewZipCode').value = '';
                            setTimeout(() => {
                                location.reload();
                            }, 300);
                        } else {
                            alert('Σφάλμα κατά την αποθήκευση.');
                        }
                    } catch (error) {
                        console.error('Error adding address:', error);
                        alert('Σφάλμα: ' + error.message);
                    }
                } else {
                    localStorage.setItem('guestAddress', `${street} ${number}, ${zip}`.trim().replace(/,$/, ''));
                    if (browseLat) localStorage.setItem('guestLat', browseLat);
                    if (browseLon) localStorage.setItem('guestLon', browseLon);
                    location.reload();
                }
            });
        }
    }
}
