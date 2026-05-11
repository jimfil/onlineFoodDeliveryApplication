/**
 * controller/cart-controller.mjs
 * Cart view and checkout processing.
 * Cart items are stored in the session (server-side).
 */
import * as userModel      from '../model/user-model.mjs';
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as orderModel     from '../model/order-model.mjs';

/** GET /cart */
export async function showCart(req, res) {
  try {
    const cart      = req.session.cart || [];
    const addresses = req.session.user
      ? await userModel.getAddresses(req.session.user.id)
      : [];

    // Compute totals
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.render('cart', { 
      cart, 
      addresses, 
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
  if (!req.session.user) {
    req.flash('error', 'Παρακαλώ συνδεθείτε για να ολοκληρώσετε την παραγγελία.');
    return res.redirect('/login');
  }

  const cart = req.session.cart || [];
  if (cart.length === 0) {
    req.flash('error', 'Το καλάθι σας είναι άδειο.');
    return res.redirect('/cart');
  }

  const { addressId } = req.body;
  if (!addressId) {
    req.flash('error', 'Επιλέξτε διεύθυνση παράδοσης.');
    return res.redirect('/cart');
  }

  try {
    const restaurantId = cart[0].restaurantId;
    const items = cart.map(i => ({ productId: i.productId, quantity: i.quantity }));

    await orderModel.createOrder(req.session.user.id, restaurantId, addressId, items);

    // Clear cart after successful order
    req.session.cart = [];
    req.flash('success', 'Η παραγγελία σας καταχωρήθηκε!');
    res.redirect('/browse');
  } catch (err) {
    console.error('Checkout error:', err);
    req.flash('error', 'Σφάλμα κατά την παραγγελία. Προσπαθήστε ξανά.');
    res.redirect('/cart');
  }
}
