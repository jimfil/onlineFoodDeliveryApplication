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
    let addresses = user ? (user.addresses || []) : [];
    if (addresses.length === 0 && user && user.address) addresses.push(user.address);
    if (addresses.length === 0 && guestAddress) addresses.push(guestAddress);

    function showAccordion() {
        if (noAddressSection) noAddressSection.classList.add('d-none');
        browseAddressAccordion.classList.remove('d-none');

        const accordionButton = document.querySelector('#browseAddressHeading .accordion-button');
        const addressCollapse = document.getElementById('browseAddressCollapse');
        const bsCollapse = new bootstrap.Collapse(addressCollapse, { toggle: false });

        // Re-read latest addresses from storage
        const freshUser = JSON.parse(localStorage.getItem('user') || '{}');
        const freshAddresses = freshUser.addresses || [];
        if (freshAddresses.length === 0 && freshUser.address) freshAddresses.push(freshUser.address);
        const freshGuestAddress = localStorage.getItem('guestAddress')?.trim();
        if (freshAddresses.length === 0 && freshGuestAddress) freshAddresses.push(freshGuestAddress);

        browseAddressList.innerHTML = freshAddresses.map((addr, i) => `
            <button type="button" class="list-group-item list-group-item-action${i === 0 ? ' active' : ''}"
                ${i === 0 ? 'aria-current="true"' : ''}>${addr}</button>
        `).join('');

        if (accordionButton && freshAddresses.length > 0) accordionButton.textContent = freshAddresses[0];
        if (restaurantSection && freshAddresses.length > 0) restaurantSection.classList.remove('d-none');

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
        if (toggleBtn && inlineForm && !toggleBtn.dataset.wired) {
            toggleBtn.dataset.wired = '1';
            toggleBtn.addEventListener('click', () => inlineForm.classList.toggle('d-none'));
            saveBtn.addEventListener('click', () => {
                const street = document.getElementById('browseNewStreet').value.trim();
                const number = document.getElementById('browseNewNumber').value.trim();
                const zip = document.getElementById('browseNewZipCode')?.value.trim() ?? '';
                if (!street || !number) return;
                addAddressToUser(street, number, zip);
                document.getElementById('browseNewStreet').value = '';
                document.getElementById('browseNewNumber').value = '';
                if (document.getElementById('browseNewZipCode')) document.getElementById('browseNewZipCode').value = '';
                inlineForm.classList.add('d-none');
                showAccordion();
            });
        }
    }

    if (addresses.length === 0) {
        if (noAddressSection) noAddressSection.classList.remove('d-none');
        browseAddressAccordion.classList.add('d-none');
        if (restaurantSection) restaurantSection.classList.add('d-none');

        const firstSaveBtn = document.getElementById('browseFirstSaveAddress');
        if (firstSaveBtn && !firstSaveBtn.dataset.wired) {
            firstSaveBtn.dataset.wired = '1';
            firstSaveBtn.addEventListener('click', () => {
                const street = document.getElementById('browseFirstStreet').value.trim();
                const number = document.getElementById('browseFirstNumber').value.trim();
                const zip = document.getElementById('browseFirstZipCode')?.value.trim() ?? '';
                if (!street || !number) return;
                addAddressToUser(street, number, zip);
                showAccordion();
            });
        }
        return;
    }

    showAccordion();
}
