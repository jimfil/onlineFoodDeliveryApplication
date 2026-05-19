/**
 * controller/restaurant-controller.mjs
 * Public restaurant view + restaurant owner admin panel.
 */
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as orderModel from '../model/order-model.mjs';
import * as accountModel from '../model/account-model.mjs';
import { validationResult } from 'express-validator';
import { getDistanceKm } from '../utils/geo-utils.mjs';

/** GET /restaurant/:id — public menu view */
export async function showRestaurant(req, res) {
  if (req.session?.user?.accountType === 'RESTAURANT') {
    return res.redirect('/manage');
  }
  try {
    const restaurant = await restaurantModel.getRestaurantById(req.params.id);
    if (!restaurant) return res.render('error', { message: 'Εστιατόριο δεν βρέθηκε.' });

    // 1. Check for valid user coordinates
    const deliveryCoords = req.session.deliveryAddress?.latitude != null && req.session.deliveryAddress?.longitude != null
      ? { lat: req.session.deliveryAddress.latitude, lon: req.session.deliveryAddress.longitude }
      : null;

    if (!deliveryCoords) {
      return res.render('error', { message: 'Απαιτείται έγκυρη διεύθυνση για να δείτε το εστιατόριο.' });
    }

    // 2. Check for restaurant coordinates and distance
    if (restaurant.latitude == null || restaurant.longitude == null) {
      return res.render('error', { message: 'Το εστιατόριο δεν έχει έγκυρες συντεταγμένες.' });
    }

    const distanceKm = getDistanceKm(deliveryCoords.lat, deliveryCoords.lon, restaurant.latitude, restaurant.longitude);
    if (distanceKm > 4) {
      return res.render('error', { message: 'Το εστιατόριο είναι εκτός εμβέλειας (πάνω από 4 χλμ).' });
    }

    // 3. Calculate delivery time
    const prepMinutes = Number.parseInt(restaurant.estimated_preparation_time, 10) || 0;
    const travelMinutes = Math.max(5, Math.round(distanceKm / 18 * 60));
    restaurant.deliveryMinutes = prepMinutes + travelMinutes;

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
    const availableRestaurantCategories = await restaurantModel.getAllRestaurantCategories();
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
      availableRestaurantCategories,
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

/** POST /manage/products/:id/edit — edit a product */
export async function editProduct(req, res) {
  const productId = req.params.id;
  const { name, price, description, categoryId, newCategoryName, imageUrl } = req.body;
  try {
    await restaurantModel.updateProduct(req.session.user.id, productId, {
      name, price, description, categoryId, newCategoryName, imageUrl
    });
    req.flash('success', 'Το προϊόν ενημερώθηκε.');
  } catch (err) {
    console.error('Edit product error:', err);
    req.flash('error', 'Σφάλμα επεξεργασίας προϊόντος: ' + err.message);
  }
  res.redirect('/manage');
}

export async function updateSettings(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/manage');
  }
  const { name, estimatedPreparationTime, operatingHours, phone, minOrderValue } = req.body;
  try {
    const restaurant = await restaurantModel.getRestaurantByUserId(req.session.user.id);
    const finalName = name || restaurant.name;
    const finalPrep = estimatedPreparationTime || restaurant.estimated_preparation_time;
    const finalHours = operatingHours || restaurant.operating_hours;
    const finalPhone = phone || restaurant.contact_phone;
    const finalMinOrder = minOrderValue !== undefined ? minOrderValue : restaurant.min_order_value;

    await restaurantModel.updateRestaurantSettings(req.session.user.id, {
      name: finalName,
      estimatedPreparationTime: finalPrep,
      operatingHours: finalHours,
      phone: finalPhone,
      minOrderValue: finalMinOrder
    });

    // Update session info if needed
    req.session.user.restaurantName = finalName;
    req.session.user.preparationTime = finalPrep;
    req.session.user.contactPhone = finalPhone;

    req.flash('success', 'Τα στοιχεία εστιατορίου ενημερώθηκαν.');
  } catch (err) {
    console.error('Settings update error:', err);
    req.flash('error', 'Σφάλμα ενημέρωσης στοιχείων.');
  }
  res.redirect('/manage');
}

/** POST /manage/address - update restaurant location */
export async function updateAddress(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/manage');
  }

  const { street, streetNumber, zipCode, latitude, longitude } = req.body;
  try {
    let cleanZip = zipCode;
    if (cleanZip) cleanZip = cleanZip.replace(/\s+/g, '');
    await restaurantModel.updateRestaurantAddress(req.session.user.id, { street, streetNumber, zipCode: cleanZip, latitude, longitude });
    req.flash('success', 'Η διεύθυνση του εστιατορίου ενημερώθηκε επιτυχώς.');
  } catch (err) {
    console.error('Update address error:', err);
    req.flash('error', 'Σφάλμα κατά την ενημέρωση της διεύθυνσης.');
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

/** POST /manage/categories — update restaurant categories */
export async function updateCategories(req, res) {
  const { categories } = req.body;
  try {
    // categories should be an array of category IDs
    const categoryIds = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    // Filter out empty strings
    const filteredIds = categoryIds.filter(id => id && id.trim() !== '');
    await restaurantModel.updateRestaurantCategories(req.session.user.id, filteredIds);
    req.flash('success', 'Οι κατηγορίες του εστιατορίου ενημερώθηκαν.');
  } catch (err) {
    console.error('Categories update error:', err);
    req.flash('error', 'Σφάλμα ενημέρωσης κατηγοριών.');
  }
  res.redirect('/manage');
}

/** GET /manage/orders — restaurant order management page */
export async function showManageOrders(req, res) {
  try {
    const restaurant = await restaurantModel.getRestaurantByUserId(req.session.user.id);
    const orders = await orderModel.getOrdersByRestaurantDetailed(req.session.user.id);
    res.render('manage-orders', { orders, restaurant });
  } catch (err) {
    console.error('Manage orders error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης παραγγελιών.' });
  }
}

/** POST /manage/orders/:id/status — update order status */
export async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const orderId = req.params.id;
  try {
    const success = await orderModel.updateOrderStatus(orderId, req.session.user.id, status);
    if (success) {
      req.flash('success', `Η κατάσταση της παραγγελίας #${orderId} ενημερώθηκε σε ${status}.`);
    } else {
      req.flash('error', 'Δεν ήταν δυνατή η ενημέρωση της παραγγελίας.');
    }
  } catch (err) {
    console.error('Status update error:', err);
    req.flash('error', 'Σφάλμα κατά την ενημέρωση της κατάστασης.');
  }
  res.redirect('/manage/orders');
}

/** POST /manage/status — toggle open/closed */
export async function toggleStatus(req, res) {
  try {
    const newStatus = await restaurantModel.toggleRestaurantStatus(req.session.user.id);
    req.flash('success', `Το κατάστημα είναι πλέον ${newStatus === 'OPEN' ? 'ΑΝΟΙΧΤΟ' : 'ΚΛΕΙΣΤΟ'}.`);
  } catch (err) {
    console.error('Toggle status error:', err);
    req.flash('error', 'Σφάλμα κατά την αλλαγή κατάστασης.');
  }
  res.redirect('/manage');
}


/** POST /manage/icon — update restaurant icon URL */
export async function updateIcon(req, res) {
  const { imageUrl } = req.body;
  try {
    await restaurantModel.updateRestaurantImage(req.session.user.id, imageUrl);
    req.flash('success', 'Το εικονίδιο του εστιατορίου ενημερώθηκε!');
  } catch (err) {
    console.error('Update icon error:', err);
    req.flash('error', 'Σφάλμα κατά την ενημέρωση του εικονιδίου.');
  }
  res.redirect('/manage');
}

/** POST /manage/delete */
export async function deleteRestaurant(req, res) {
  try {
    await accountModel.deleteAccount(req.session.user.id, 'RESTAURANT');
    req.session.destroy(err => {
      if (err) console.error('Session destruction error:', err);
      res.redirect('/?deleted=true');
    });
  } catch (err) {
    console.error('Delete restaurant error:', err);
    req.flash('error', 'Σφάλμα διαγραφής λογαριασμού.');
    res.redirect('/manage');
  }
}
