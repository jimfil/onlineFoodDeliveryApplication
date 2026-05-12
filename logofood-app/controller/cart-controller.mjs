/**
 * controller/cart-controller.mjs
 * Cart view and checkout processing.
 * Cart items are stored in the session (server-side).
 */
import * as userModel from '../model/user-model.mjs';
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as orderModel from '../model/order-model.mjs';

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

    res.render('cart', {
      cart,
      addresses,
      customer,
      total,
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

  let addressId = req.body.addressId;
  let customerId = req.session.user ? req.session.user.id : null;
  const { floor, comments, phone } = req.body;

  try {
    const pool = (await import('../model/db.mjs')).default;
    // If guest, create a temporary address
    if (!customerId) {
      let { street, streetNumber, zipCode } = req.body;
      if (zipCode) zipCode = zipCode.replace(/\s+/g, '');

      if (!street || !streetNumber || !floor || !phone) {
        req.flash('error', 'Συμπληρώστε την οδό, τον αριθμό, τον όροφο και το τηλέφωνο για την παράδοση.');
        return res.redirect('/cart');
      }

      const guestComments = comments ? `Τηλέφωνο: ${phone} | Σχόλια: ${comments}` : `Τηλέφωνο: ${phone}`;

      const [addrRes] = await pool.execute(
        `INSERT INTO Address (street, street_number, zip_code, floor, comments) VALUES (?, ?, ?, ?, ?)`,
        [street, streetNumber, zipCode || null, floor, guestComments]
      );
      addressId = addrRes.insertId;
    } else if (!addressId) {
      req.flash('error', 'Επιλέξτε διεύθυνση παράδοσης.');
      return res.redirect('/cart');
    } else {
      // Update the existing address with the floor and comments (including phone) provided at checkout
      const finalComments = comments;
      await pool.execute(
        `UPDATE Address SET floor = ?, comments = ? WHERE id = ?`,
        [floor || null, finalComments, addressId]
      );
      await pool.execute(
        `UPDATE Customer SET phone = ? WHERE id = ?`,
        [phone, customerId]
      );
    }

    const restaurantId = cart[0].restaurantId;
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

