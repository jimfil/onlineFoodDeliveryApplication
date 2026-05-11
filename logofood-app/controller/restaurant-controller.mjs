/**
 * controller/restaurant-controller.mjs
 * Public restaurant view + restaurant owner admin panel.
 */
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as orderModel from '../model/order-model.mjs';

/** GET /restaurant/:id — public menu view */
export async function showRestaurant(req, res) {
  if (req.session?.user?.accountType === 'RESTAURANT') {
    return res.redirect('/manage');
  }
  try {
    const restaurant = await restaurantModel.getRestaurantById(req.params.id);
    if (!restaurant) return res.render('error', { message: 'Εστιατόριο δεν βρέθηκε.' });

    const categories = await restaurantModel.getRestaurantMenu(req.params.id);
    const cart = req.session.cart || [];
    res.render('restaurant', { restaurant, categories, cart });
  } catch (err) {
    console.error('Restaurant error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης εστιατορίου.' });
  }
}

export async function showManage(req, res) {
  try {
    const restaurant = await restaurantModel.getRestaurantByUserId(req.session.user.id);
    const products = await restaurantModel.getRestaurantProducts(req.session.user.id);
    const allCategories = await restaurantModel.getAllCategories(req.session.user.id);
    const restaurantCategories = await restaurantModel.getCategoriesByRestaurant(req.session.user.id);
    const orders = await orderModel.getOrdersByRestaurant(req.session.user.id);

    // Group products by category for the view
    const productsByCategory = allCategories
      .map(cat => ({
        categoryName: cat.name,
        products: products.filter(p => p.category_id === cat.id)
      }))
      .filter(c => c.products.length > 0);

    res.render('manage-restaurant', { 
      restaurant, 
      products, 
      allCategories,
      restaurantCategories,
      productsByCategory,
      orders
    });
  } catch (err) {
    console.error('Manage error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης διαχείρισης.' });
  }
}

/** POST /manage/products — add a product */
export async function addProduct(req, res) {
  const { name, price, description, categoryId, newCategoryName, imageUrl } = req.body;
  try {
    await restaurantModel.createProduct(req.session.user.id, {
      name, price, description, categoryId, newCategoryName, imageUrl
    });
    req.flash('success', 'Το προϊόν προστέθηκε.');
  } catch (err) {
    console.error('Add product error:', err);
    req.flash('error', 'Σφάλμα προσθήκης προϊόντος: ' + err.message);
  }
  res.redirect('/manage');
}

/** POST /manage/products/:id/delete — delete a product */
export async function deleteProduct(req, res) {
  try {
    await restaurantModel.deleteProduct(req.session.user.id, req.params.id);
    req.flash('success', 'Το προϊόν διαγράφηκε.');
  } catch (err) {
    console.error('Delete product error:', err);
    req.flash('error', 'Σφάλμα διαγραφής προϊόντος.');
  }
  res.redirect('/manage');
}

export async function updateSettings(req, res) {
  const { name, estimatedPreparationTime, operatingHours } = req.body;
  try {
    const restaurant = await restaurantModel.getRestaurantByUserId(req.session.user.id);
    const finalName = name || restaurant.name;
    const finalPrep = estimatedPreparationTime || restaurant.estimated_preparation_time;
    const finalHours = operatingHours || restaurant.operating_hours;

    await restaurantModel.updateRestaurantSettings(req.session.user.id, { 
      name: finalName, 
      estimatedPreparationTime: finalPrep,
      operatingHours: finalHours
    });
    
    // Update session info if needed
    req.session.user.restaurantName = finalName;
    req.session.user.preparationTime  = finalPrep;
    
    req.flash('success', 'Τα στοιχεία εστιατορίου ενημερώθηκαν.');
  } catch (err) {
    console.error('Settings update error:', err);
    req.flash('error', 'Σφάλμα ενημέρωσης στοιχείων.');
  }
  res.redirect('/manage');
}

/** POST /manage/reorder — reorder category or product */
export async function reorder(req, res) {
  const { type, id, direction } = req.body;
  try {
    await restaurantModel.reorderItem(req.session.user.id, type, id, direction);
    res.json({ success: true });
  } catch (err) {
    console.error('Reorder error:', err);
    res.status(500).json({ error: 'Αποτυχία αναδιάταξης.' });
  }
}
