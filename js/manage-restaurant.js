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
    document.getElementById('restaurantName').textContent = user.restaurantName || 'Το Κατάστημά μου';
    document.getElementById('settingsName').value = user.restaurantName || '';
    document.getElementById('prepTime').value = user.preparationTime || '';

    // Initial Data Load
    initDashboard();

    // Form Submission Handlers
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmission);
    }

    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmission);
    }
});

/**
 * Handle Restaurant Settings Update
 */
async function handleSettingsSubmission(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    
    const settingsData = {
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
            alert('Οι ρυθμίσεις ενημερώθηκαν!');
            // Update local storage
            const user = JSON.parse(localStorage.getItem('user'));
            user.restaurantName = settingsData.name;
            user.preparationTime = settingsData.estimatedPreparationTime;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Refresh header
            document.getElementById('restaurantName').textContent = user.restaurantName;
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
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

/**
 * Fetch existing product categories and populate dropdown
 * API Context: Product_Category (id, name, display_order)
 */
async function fetchCategories() {
    const categorySelect = document.getElementById('categorySelect');
    
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const categories = await response.json();
        
        // Clear existing options except placeholder
        categorySelect.innerHTML = '<option value="" disabled selected>Επιλέξτε κατηγορία...</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback placeholder data for demonstration
        const demoCategories = [
            { id: 1, name: 'Κυρίως Πιάτα' },
            { id: 2, name: 'Επιδόρπια' },
            { id: 3, name: 'Ποτά & Αναψυκτικά' }
        ];
        demoCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    }
}

/**
 * Fetch and render existing menu items
 * API Context: Joins Product and Product_Category_Mapping
 */
async function fetchMenuItems() {
    const tableBody = document.getElementById('menuTableBody');
    
    try {
        const response = await fetch('/api/restaurant/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        
        const products = await response.json();
        renderMenuItems(products);
    } catch (error) {
        console.error('Error loading menu:', error);
        // Boilerplate empty state
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
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Δεν βρέθηκαν προϊόντα. Προσθέστε το πρώτο σας προϊόν!</td></tr>`;
        return;
    }

    products.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'menu-item-row';
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <img src="${item.imageUrl || '../assets/placeholder-food.jpg'}" class="product-img-preview me-3" alt="${item.name}">
                    <div>
                        <p class="mb-0 fw-bold">${item.name}</p>
                        <p class="mb-0 text-muted extra-small">${item.description || 'Χωρίς περιγραφή'}</p>
                    </div>
                </div>
            </td>
            <td><span class="category-badge">${item.categoryName || 'Γενική'}</span></td>
            <td><span class="price-tag">${parseFloat(item.price).toFixed(2)}€</span></td>
            <td class="text-end">
                <button class="action-btn btn-edit" title="Επεξεργασία"><i class="bi bi-pencil-square"></i></button>
                <button class="action-btn btn-delete" title="Διαγραφή" onclick="deleteProduct(${item.id})"><i class="bi bi-trash3"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Handle Add Product Form Submission
 * Constructs payload for Product and Category Mapping
 */
async function handleProductSubmission(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value,
        categoryId: parseInt(document.getElementById('categorySelect').value),
        price: parseFloat(document.getElementById('price').value),
        description: document.getElementById('description').value,
        imageUrl: document.getElementById('imageUrl').value
    };

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Το προϊόν προστέθηκε επιτυχώς!');
            document.getElementById('productForm').reset();
            fetchMenuItems(); // Refresh list
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
 * Placeholder delete function
 */
async function deleteProduct(id) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το προϊόν;')) return;
    
    try {
        const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (response.ok) {
            fetchMenuItems();
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

