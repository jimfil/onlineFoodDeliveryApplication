/**
 * Restaurant Management Dashboard Logic
 * Handles Product and Category interactions according to the relational schema.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is a restaurant
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.accountType !== 'RESTAURANT') {
        window.location.href = 'login.html';
        return;
    }

    // Update UI with restaurant data
    document.getElementById('headerRestaurantName').textContent = user.restaurantName || 'Το Κατάστημά μου';
    document.getElementById('settingsName').value = user.restaurantName || '';
    document.getElementById('prepTime').value = user.preparationTime || '';

    // Initial Data Load
    initDashboard();

    // Form Submission Handlers
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmission);
    }

    // Separate settings forms
    const nameForm = document.getElementById('nameForm');
    if (nameForm) {
        nameForm.addEventListener('submit', (e) => handleSettingsUpdate(e, 'name'));
    }

    const prepTimeForm = document.getElementById('prepTimeForm');
    if (prepTimeForm) {
        prepTimeForm.addEventListener('submit', (e) => handleSettingsUpdate(e, 'prepTime'));
    }

    // Category Toggle Logic
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryWrapper = document.getElementById('newCategoryWrapper');
    if (categorySelect && newCategoryWrapper) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === 'NEW') {
                newCategoryWrapper.classList.remove('d-none');
                document.getElementById('newCategoryName').setAttribute('required', 'required');
            } else {
                newCategoryWrapper.classList.add('d-none');
                document.getElementById('newCategoryName').removeAttribute('required');
            }
        });
    }
});

/**
 * Handle Restaurant Settings Update (Separate for Name and Time)
 */
async function handleSettingsUpdate(event, type) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    let settingsData = {
        name: document.getElementById('settingsName').value,
        estimatedPreparationTime: document.getElementById('prepTime').value
    };

    try {
        const response = await fetch('/api/users/restaurant-details', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settingsData)
        });

        if (response.ok) {
            alert('Η ρύθμιση ενημερώθηκε επιτυχώς!');
            // Update local storage
            user.restaurantName = settingsData.name;
            user.preparationTime = settingsData.estimatedPreparationTime;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Refresh header
            document.getElementById('headerRestaurantName').textContent = user.restaurantName;
        } else {
            alert('Σφάλμα κατά την ενημέρωση.');
        }
    } catch (error) {
        console.error('Settings update error:', error);
    }
}

/**
 * Initialize Dashboard Data
 */
async function initDashboard() {
    try {
        await Promise.all([
            fetchCategories(),
            fetchMenuItems()
        ]);
        renderCategoryOrder();
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

let allCategories = [];
let allProducts = [];

/**
 * Fetch existing product categories and populate dropdown
 */
async function fetchCategories() {
    const categorySelect = document.getElementById('categorySelect');
    
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        allCategories = await response.json();
        
        // Preserve placeholder and "NEW" option
        categorySelect.innerHTML = `
            <option value="" disabled selected>Επιλέξτε κατηγορία...</option>
            <option value="NEW">+ Νέα Κατηγορία...</option>
        `;
        
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Render Category Order List with Up/Down buttons
 */
function renderCategoryOrder() {
    const container = document.getElementById('categoryOrderList');
    if (!container) return;

    container.innerHTML = '';
    
    allCategories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'category-order-item d-flex align-items-center gap-2 p-2 border rounded bg-white shadow-sm';
        div.innerHTML = `
            <span class="fw-bold small">${cat.name}</span>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary py-0" onclick="moveCategory(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>
                <button class="btn btn-outline-secondary py-0" onclick="moveCategory(${index}, 1)" ${index === allCategories.length - 1 ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function moveCategory(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allCategories.length) return;

    // Swap
    const temp = allCategories[index];
    allCategories[index] = allCategories[newIndex];
    allCategories[newIndex] = temp;

    // Persist
    await saveOrder('category', allCategories);
    initDashboard();
}

/**
 * Fetch and render existing menu items
 */
async function fetchMenuItems() {
    const tableBody = document.getElementById('menuTableBody');
    
    try {
        const response = await fetch('/api/products/restaurant/products', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch products');
        
        allProducts = await response.json();
        renderMenuItems(allProducts);
    } catch (error) {
        console.error('Error loading menu:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Δεν βρέθηκαν προϊόντα. Προσθέστε το πρώτο σας προϊόν!</td></tr>`;
    }
}

/**
 * Render menu rows into the table
 */
function renderMenuItems(products) {
    const tableBody = document.getElementById('menuTableBody');
    tableBody.innerHTML = '';

    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Δεν βρέθηκαν προϊόντα. Προσθέστε το πρώτο σας προϊόν!</td></tr>`;
        return;
    }

    let currentCategory = null;

    products.forEach((item, index) => {
        // Add Category Header Row if category changes
        if (item.categoryName !== currentCategory) {
            currentCategory = item.categoryName;
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <td colspan="5" class="bg-light py-3 ps-3">
                    <h6 class="fw-bold mb-0 text-primary">${currentCategory || 'Χωρίς Κατηγορία'}</h6>
                </td>
            `;
            tableBody.appendChild(headerRow);
        }

        const row = document.createElement('tr');
        row.className = 'menu-item-row';
        row.innerHTML = `
            <td style="width: 50%;">
                <div class="d-flex align-items-center">
                    <img src="${item.image_url || '../assets/placeholder-food.jpg'}" class="product-img-preview me-3" alt="${item.name}">
                    <div>
                        <p class="mb-0 fw-bold">${item.name}</p>
                        <p class="mb-0 text-muted extra-small">${item.description || 'Χωρίς περιγραφή'}</p>
                    </div>
                </div>
            </td>
            <td style="width: 15%;"><span class="price-tag">${parseFloat(item.price).toFixed(2)}€</span></td>
            <td style="width: 15%;">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-light text-dark btn-sm" onclick="moveProduct(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="bi bi-chevron-up"></i></button>
                    <button class="btn btn-outline-light text-dark btn-sm" onclick="moveProduct(${index}, 1)" ${index === products.length - 1 ? 'disabled' : ''}><i class="bi bi-chevron-down"></i></button>
                </div>
            </td>
            <td class="text-end" style="width: 20%;">
                <button class="action-btn btn-edit" title="Επεξεργασία"><i class="bi bi-pencil-square"></i></button>
                <button class="action-btn btn-delete" title="Διαγραφή" onclick="deleteProduct(${item.id})"><i class="bi bi-trash3"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function moveProduct(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allProducts.length) return;

    // Swap
    const temp = allProducts[index];
    allProducts[index] = allProducts[newIndex];
    allProducts[newIndex] = temp;

    // Persist
    await saveOrder('product', allProducts);
    fetchMenuItems();
}

async function saveOrder(type, items) {
    const token = localStorage.getItem('token');
    const orderData = {
        type: type,
        items: items.map((item, idx) => ({ id: item.id, order: idx }))
    };

    try {
        await fetch('/api/products/order', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
    } catch (error) {
        console.error('Save order error:', error);
    }
}

/**
 * Handle Add Product Form Submission
 */
async function handleProductSubmission(event) {
    event.preventDefault();
    
    const categoryVal = document.getElementById('categorySelect').value;
    const isNewCategory = categoryVal === 'NEW';
    
    const formData = {
        name: document.getElementById('name').value,
        price: parseFloat(document.getElementById('price').value),
        description: document.getElementById('description').value,
        imageUrl: document.getElementById('imageUrl').value,
        // If NEW, we send the name. Backend should handle creation.
        categoryId: isNewCategory ? null : parseInt(categoryVal),
        newCategoryName: isNewCategory ? document.getElementById('newCategoryName').value : null
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Το προϊόν προστέθηκε επιτυχώς!');
            document.getElementById('productForm').reset();
            document.getElementById('newCategoryWrapper').classList.add('d-none');
            
            // Refresh categories (in case a new one was added) and menu
            await initDashboard();
        } else {
            const error = await response.json();
            alert('Σφάλμα: ' + error.message);
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Αποτυχία σύνδεσης με τον διακομιστή.');
    }
}

/**
 * Delete product
 */
async function deleteProduct(id) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το προϊόν;')) return;
    
    try {
        const response = await fetch(`/api/products/${id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            fetchMenuItems();
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}
