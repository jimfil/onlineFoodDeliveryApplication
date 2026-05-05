// ─── restaurant.js ───────────────────────────────────────────────
// Renders quantity controls for each menu item on the restaurant page

document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateAuthNav === 'function') updateAuthNav();
    if (typeof updateCartBadge === 'function') updateCartBadge();
    renderMenuControls();
});

function renderMenuControls() {
    document.querySelectorAll('.menu-item-control').forEach(el => {
        const name = el.dataset.name;
        const price = parseFloat(el.dataset.price);
        const qty = getItemCount(name);

        if (qty === 0) {
            el.innerHTML = `
                <button class="btn btn-menu w-100 fw-bold btn-sm"
                    onclick="menuAdd('${escapeName(name)}', ${price})">
                    Προσθήκη
                </button>`;
        } else {
            el.innerHTML = `
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <button class="btn btn-outline-danger fw-bold btn-sm px-3"
                        onclick="menuRemove('${escapeName(name)}')">−</button>
                    <span class="fw-bold fs-6" style="min-width: 1.5rem; text-align: center;">${qty}</span>
                    <button class="btn btn-menu fw-bold btn-sm px-3"
                        onclick="menuAdd('${escapeName(name)}', ${price})">+</button>
                </div>`;
        }
    });
}

// Safely escape item names for use inside onclick attributes
function escapeName(name) {
    return name.replace(/'/g, "\\'");
}

function menuAdd(name, price) {
    addToCart({ name, price });
    renderMenuControls();
}

function menuRemove(name) {
    removeFromCart(name);
    renderMenuControls();
}
