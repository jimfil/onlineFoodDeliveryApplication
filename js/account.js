// ─── account.js ──────────────────────────────────────────────────
// Handles account management page: update name, manage addresses, change password

document.addEventListener('DOMContentLoaded', () => {
    renderAccountPage();
});

function renderAccountPage() {
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const addAddressForm = document.getElementById('addAddressForm');
    const accountNameInput = document.getElementById('accountName');

    if (!updateNameForm) return;

    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return;
    }

    const user = JSON.parse(userStr);
    accountNameInput.value = user.name || '';
    renderAddresses(user);

    updateNameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        user.name = accountNameInput.value;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('nameSuccessMsg').classList.remove('d-none');
        updateAuthNav();
        setTimeout(() => document.getElementById('nameSuccessMsg').classList.add('d-none'), 3000);
    });

    updatePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('passwordSuccessMsg').classList.remove('d-none');
        updatePasswordForm.reset();
        setTimeout(() => document.getElementById('passwordSuccessMsg').classList.add('d-none'), 3000);
    });

    addAddressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const street = document.getElementById('newStreet').value;
        const number = document.getElementById('newStreetNumber').value;
        const newAddress = `${street} ${number}`;

        if (!user.addresses) {
            user.addresses = [];
            if (user.address) user.addresses.push(user.address);
        }
        if (!user.addresses.includes(newAddress)) {
            user.addresses.push(newAddress);
            user.address = newAddress;
            localStorage.setItem('user', JSON.stringify(user));
            renderAddresses(user);
        }
        addAddressForm.reset();
    });
}

function renderAddresses(user) {
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
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            addresses.splice(index, 1);
            user.addresses = addresses;
            if (user.address && !addresses.includes(user.address)) {
                user.address = addresses.length > 0 ? addresses[0] : '';
            }
            localStorage.setItem('user', JSON.stringify(user));
            renderAddresses(user);
        });
    });
}
