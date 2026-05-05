// ─── account.js ──────────────────────────────────────────────────
// Handles account management page: update name, manage addresses, change password

document.addEventListener('DOMContentLoaded', () => {
    updateAuthNav(); // Update auth nav first with current data
    renderAccountPage(); // Then render the page, which will update with fresh data
});

function renderAccountPage() {
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const addAddressForm = document.getElementById('addAddressForm');
    const accountFirstName = document.getElementById('accountFirstName');
    const accountLastName = document.getElementById('accountLastName');
    const accountPhone = document.getElementById('accountPhone');

    if (!updateNameForm) return;

    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    // Load user profile and addresses from backend
    loadUserData();

    async function loadUserData() {
        try {
            const profile = await getUserProfile();
            const addresses = await getUserAddresses();

            // Update localStorage with fresh data
            const user = JSON.parse(userStr);
            user.firstName = profile.firstName;
            user.lastName = profile.lastName;
            user.contactPhone = profile.contactPhone;
            user.addresses = addresses.map(addr => `${addr.street} ${addr.street_number}`);
            user.rawAddresses = addresses; // Store raw addresses with IDs
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI
            if (accountFirstName) accountFirstName.value = profile.firstName || '';
            if (accountLastName) accountLastName.value = profile.lastName || '';
            if (accountPhone) accountPhone.value = profile.contactPhone || '';
            renderAddresses(user, addresses);

            // Update the auth nav with the correct name
            updateAuthNav();

        } catch (error) {
            console.error('Failed to load user data:', error);
            // Fallback to localStorage data
            const user = JSON.parse(userStr);
            if (accountFirstName) accountFirstName.value = user.firstName || '';
            if (accountLastName) accountLastName.value = user.lastName || '';
            if (accountPhone) accountPhone.value = user.contactPhone || '';
            renderAddresses(user);
        }
    }

    // Make loadUserData available globally for the remove button
    window.loadUserData = loadUserData;

    updateNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = accountFirstName.value.trim();
        const lastName = accountLastName.value.trim();
        const contactPhone = accountPhone.value.trim();

        try {
            await updateUserProfile({ firstName, lastName, contactPhone });

            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.firstName = firstName;
                user.lastName = lastName;
                user.contactPhone = contactPhone;
                localStorage.setItem('user', JSON.stringify(user));
            }

            document.getElementById('nameSuccessMsg').classList.remove('d-none');
            updateAuthNav();
            setTimeout(() => document.getElementById('nameSuccessMsg').classList.add('d-none'), 3000);
        } catch (error) {
            alert('Failed to update name: ' + error.message);
        }
    });

    updatePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('passwordSuccessMsg').classList.remove('d-none');
        updatePasswordForm.reset();
        setTimeout(() => document.getElementById('passwordSuccessMsg').classList.add('d-none'), 3000);
    });

    addAddressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const street = document.getElementById('newStreet').value.trim();
        const number = document.getElementById('newStreetNumber').value.trim();
        const zipCode = document.getElementById('newZipCode').value.trim();

        try {
            await addUserAddress(street, number, zipCode);
            addAddressForm.reset();
            // Reload user data to show new address
            await loadUserData();
        } catch (error) {
            alert('Failed to add address: ' + error.message);
        }
    });
}

function renderAddresses(user, rawAddresses = null) {
    const addressList = document.getElementById('addressList');
    if (!addressList) return;

    let addresses = user.addresses || [];
    if (addresses.length === 0 && user.address) addresses.push(user.address);

    const accordionButton = document.querySelector('#accountAddressHeading .accordion-button');

    if (addresses.length === 0) {
        addressList.innerHTML = '<div class="list-group-item text-muted">Δεν υπάρχουν αποθηκευμένες διευθύνσεις.</div>';
        if (accordionButton) accordionButton.textContent = 'Οι διευθύνσεις μου';
        return;
    }

    addressList.innerHTML = addresses.map((addr, index) => `
        <div class="list-group-item d-flex justify-content-between align-items-center${index === 0 ? ' active' : ''}"
             ${index === 0 ? 'aria-current="true"' : ''} data-index="${index}">
            <span>${addr}</span>
            <button class="btn btn-sm btn-outline-danger remove-address-btn ms-2" data-index="${index}">Αφαίρεση</button>
        </div>
    `).join('');

    if (accordionButton) accordionButton.textContent = addresses[0];

    const items = addressList.querySelectorAll('.list-group-item');
    const addressCollapse = document.getElementById('accountAddressCollapse');
    const bootstrapCollapse = new bootstrap.Collapse(addressCollapse, { toggle: false });

    function setActive(item) {
        items.forEach(i => { i.classList.remove('active'); i.removeAttribute('aria-current'); });
        item.classList.add('active');
        item.setAttribute('aria-current', 'true');
        if (accordionButton) accordionButton.textContent = item.querySelector('span').textContent.trim();
        bootstrapCollapse.hide();
    }

    items.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.remove-address-btn')) return;
            setActive(item);
        });
    });

    const removeBtns = addressList.querySelectorAll('.remove-address-btn');
    removeBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));

            try {
                // Use raw addresses data if available, otherwise fetch again
                let addressesData = rawAddresses;
                if (!addressesData) {
                    addressesData = await getUserAddresses();
                }
                const addressId = addressesData[index].id;
                await deleteUserAddress(addressId);

                // Reload user data
                await window.loadUserData();
            } catch (error) {
                if (error.message.includes('Address not found')) {
                    // This is an old localStorage address that doesn't exist in backend
                    // Remove it from localStorage only
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (user.addresses && user.addresses[index]) {
                        user.addresses.splice(index, 1);
                        localStorage.setItem('user', JSON.stringify(user));
                        renderAddresses(user);
                    }
                } else {
                    alert('Failed to delete address: ' + error.message);
                }
            }
        });
    });
}
