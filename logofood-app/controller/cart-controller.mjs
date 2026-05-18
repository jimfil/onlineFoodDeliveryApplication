/**
 * controller/cart-controller.mjs
 * Cart view and checkout processing.
 * Cart items are stored in the session (server-side).
 */
import * as userModel from '../model/user-model.mjs';
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as orderModel from '../model/order-model.mjs';
import { getDistanceKm } from '../utils/geo-utils.mjs';

/** GET /cart */
export async function showCart(req, res) {
  try {
    const cart = req.session.cart || [];
    const addresses = req.session.user
      ? await userModel.getAddresses(req.session.user.id)
      : [];

    let customer = null;
    if (req.session.user && req.session.user.accountType === 'CUSTOMER') {
      customer = await userModel.getCustomerById(req.session.user.id);
    }

    // Compute totals
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Fetch min order value for the restaurant in the cart
    let minOrderValue = 0;
    if (cart.length > 0) {
      const restaurant = await restaurantModel.getRestaurantById(cart[0].restaurantId);
      minOrderValue = restaurant ? parseFloat(restaurant.min_order_value) || 0 : 0;
    }

    res.render('cart', {
      cart,
      addresses,
      customer,
      total,
      minOrderValue,
      deliveryAddress: req.session.deliveryAddress || {}
    });
  } catch (err) {
    console.error('Cart error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης καλαθιού.' });
  }
}

/** POST /cart/add — add item to session cart */
export async function addToCart(req, res) {
  const { productId, name, price, restaurantId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  // Enforce single-restaurant cart
  if (req.session.cart.length > 0 && req.session.cart[0].restaurantId != restaurantId) {
    return res.status(400).json({ error: 'Μπορείτε να παραγγείλετε από ένα μόνο εστιατόριο τη φορά.' });
  }

  const existing = req.session.cart.find(i => i.productId == productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    req.session.cart.push({ productId: parseInt(productId), name, price: parseFloat(price), restaurantId: parseInt(restaurantId), quantity: 1 });
  }
  res.json({
    cartCount: req.session.cart.reduce((s, i) => s + i.quantity, 0),
    cart: req.session.cart
  });
}

/** POST /cart/remove — reduce or remove item from session cart */
export async function removeFromCart(req, res) {
  const { productId } = req.body;
  if (!req.session.cart) return res.json({ cartCount: 0 });

  const idx = req.session.cart.findIndex(i => i.productId == productId);
  if (idx !== -1) {
    if (req.session.cart[idx].quantity > 1) {
      req.session.cart[idx].quantity -= 1;
    } else {
      req.session.cart.splice(idx, 1);
    }
  }
  res.json({
    cartCount: req.session.cart.reduce((s, i) => s + i.quantity, 0),
    cart: req.session.cart
  });
}

/** POST /cart/delete — remove entire product from session cart */
export async function deleteFromCart(req, res) {
  const { productId } = req.body;
  if (!req.session.cart) return res.json({ cartCount: 0 });

  const idx = req.session.cart.findIndex(i => i.productId == productId);
  if (idx !== -1) {
    req.session.cart.splice(idx, 1);
  }
  res.json({
    cartCount: req.session.cart.reduce((s, i) => s + i.quantity, 0),
    cart: req.session.cart
  });
}


/** GET /cart/count — return cart item count (for badge update via fetch) */
export async function cartCount(req, res) {
  const count = (req.session.cart || []).reduce((s, i) => s + i.quantity, 0);
  res.json({ count });
}

/** POST /cart/checkout — create the order */
export async function checkout(req, res) {
  // Removed require session user redirect

  const cart = req.session.cart || [];
  if (cart.length === 0) {
    req.flash('error', 'Το καλάθι σας είναι άδειο.');
    return res.redirect('/cart');
  }

  // Enforce minimum order value
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const restaurantId = cart[0].restaurantId;
  const restaurant = await restaurantModel.getRestaurantById(restaurantId);
  const minOrderValue = restaurant ? parseFloat(restaurant.min_order_value) || 0 : 0;
  if (minOrderValue > 0 && total < minOrderValue) {
    req.flash('error', `Η ελάχιστη παραγγελία για αυτό το εστιατόριο είναι ${minOrderValue.toFixed(2).replace('.', ',')}€. Προσθέστε περισσότερα προϊόντα.`);
    return res.redirect('/cart');
  }

  let addressId = req.body.addressId;
  let customerId = req.session.user ? req.session.user.id : null;
  const { floor, comments, phone } = req.body;
  const phoneRegex = /^\d{10}$/;

  try {
    const pool = (await import('../model/db.mjs')).default;

    // Resolve delivery address lat/lon
    let deliveryLat = null;
    let deliveryLon = null;

    // If guest, create a temporary address
    if (!customerId) {
      let { street, streetNumber, zipCode } = req.body;
      if (zipCode) zipCode = zipCode.replace(/\s+/g, '');

      if (!street || !streetNumber || !floor || !phone) {
        req.flash('error', 'Συμπληρώστε την οδό, τον αριθμό, τον όροφο και το τηλέφωνο για την παράδοση.');
        return res.redirect('/cart');
      }

      if (!phoneRegex.test(phone)) {
        req.flash('error', 'Το τηλέφωνο πρέπει να είναι 10 ψηφία.');
        return res.redirect('/cart');
      }

      // Use coordinates submitted from the guest form (set by Leaflet/Nominatim)
      deliveryLat = req.body.latitude ? parseFloat(req.body.latitude) : null;
      deliveryLon = req.body.longitude ? parseFloat(req.body.longitude) : null;

      const guestComments = comments ? `${comments}| Τηλέφωνο: ${phone}` : `Τηλέφωνο: ${phone}`;

      const [addrRes] = await pool.execute(
        `INSERT INTO Address (street, street_number, zip_code, floor, comments, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [street, streetNumber, zipCode || null, floor, guestComments, deliveryLat, deliveryLon]
      );
      addressId = addrRes.insertId;
    } else if (!addressId) {
      req.flash('error', 'Επιλέξτε διεύθυνση παράδοσης.');
      return res.redirect('/cart');
    } else {
      // Logged-in user: read lat/lon from their saved address
      const [addrRows] = await pool.execute(
        `SELECT latitude, longitude FROM Address WHERE id = ?`, [addressId]
      );
      if (addrRows.length > 0) {
        deliveryLat = addrRows[0].latitude ? parseFloat(addrRows[0].latitude) : null;
        deliveryLon = addrRows[0].longitude ? parseFloat(addrRows[0].longitude) : null;
      }

      await pool.execute(
        `UPDATE Address SET floor = ?, comments = ? WHERE id = ?`,
        [floor || null, comments, addressId]
      );
    }

    // Distance validation: require coordinates and max 4km
    if (!deliveryLat || !deliveryLon) {
      req.flash('error', 'Η διεύθυνση παράδοσης δεν έχει γεωγραφικές συντεταγμένες. Παρακαλούμε επιλέξτε τη διεύθυνση στο χάρτη.');
      return res.redirect('/cart');
    }
    const restLat = restaurant.latitude ? parseFloat(restaurant.latitude) : null;
    const restLon = restaurant.longitude ? parseFloat(restaurant.longitude) : null;
    if (!restLat || !restLon) {
      req.flash('error', 'Δεν ήταν δυνατός ο έλεγχος απόστασης. Επικοινωνήστε με το εστιατόριο.');
      return res.redirect('/cart');
    }
    const distKm = getDistanceKm(deliveryLat, deliveryLon, restLat, restLon);
    if (distKm > 4) {
      req.flash('error', `Η διεύθυνση παράδοσης είναι εκτός της περιοχής εξυπηρέτησης (${distKm.toFixed(1)} km). Το εστιατόριο εξυπηρετεί έως 4 km.`);
      return res.redirect('/cart');
    }

    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }));

    const orderId = await orderModel.createOrder(customerId, restaurantId, addressId, items);

    if (!customerId) {
      if (!req.session.guestOrderIds) req.session.guestOrderIds = [];
      req.session.guestOrderIds.push(orderId);
    }

    // Clear cart after successful order
    req.session.cart = [];
    req.flash('success', 'Η παραγγελία σας καταχωρήθηκε!');
    res.redirect('/track-orders');
  } catch (err) {
    console.error('Checkout error:', err);
    req.flash('error', 'Σφάλμα κατά την παραγγελία. Προσπαθήστε ξανά.');
    res.redirect('/cart');
  }
}

/** POST /cart/clear — empty the entire cart */
export async function clearCart(req, res) {
  req.session.cart = [];
  res.json({ success: true, cartCount: 0 });
}

