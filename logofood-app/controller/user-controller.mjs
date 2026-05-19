/**
 * controller/user-controller.mjs
 * Customer account & address management.
 */
import * as userModel from '../model/user-model.mjs';
import * as orderModel from '../model/order-model.mjs';
import * as accountModel from '../model/account-model.mjs';
import { validationResult } from 'express-validator';
import appEvents from '../utils/events.mjs';


/** GET /account */
export async function showAccount(req, res) {
  try {
    const addresses = await userModel.getAddresses(req.session.user.id);
    const customer = await userModel.getCustomerById(req.session.user.id);
    res.render('account', { addresses, customer });
  } catch (err) {
    console.error('Account error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης λογαριασμού.' });
  }
}

/** POST /account/profile */
export async function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/account');
  }

  const { firstName, lastName, contactPhone } = req.body;
  try {
    await userModel.updateProfile(req.session.user.id, { firstName, lastName, contactPhone });
    // Update session data too
    req.session.user.firstName = firstName;
    req.session.user.lastName  = lastName;
    req.session.user.contactPhone = contactPhone;
    req.flash('success', 'Τα στοιχεία σας ενημερώθηκαν.');
  } catch (err) {
    console.error('Profile update error:', err);
    req.flash('error', 'Σφάλμα ενημέρωσης στοιχείων.');
  }
  res.redirect('/account');
}

/** POST /account/delete */
export async function deleteAccount(req, res) {
  try {
    await accountModel.deleteAccount(req.session.user.id, 'CUSTOMER');
    req.session.destroy(err => {
      if (err) console.error('Session destruction error:', err);
      res.redirect('/?deleted=true');
    });
  } catch (err) {
    console.error('Delete account error:', err);
    req.flash('error', 'Σφάλμα διαγραφής λογαριασμού.');
    res.redirect('/account');
  }
}

/** POST /account/addresses */
export async function addAddress(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/account');
  }

  let { street, streetNumber, zipCode, latitude, longitude, floor, comments } = req.body;
  if (zipCode) zipCode = zipCode.replace(/\s+/g, '');

  try {
    await userModel.addAddress(req.session.user.id, { street, streetNumber, zipCode, latitude, longitude, floor, comments });
    // Update session to reflect the new address immediately
    req.session.deliveryAddress = { street, streetNumber, zipCode, latitude, longitude };
    req.flash('success', 'Η διεύθυνση προστέθηκε.');
  } catch (err) {
    console.error('Add address error:', err);
    req.flash('error', 'Σφάλμα προσθήκης διεύθυνσης.');
  }
  res.redirect('/account');
}

/** POST /account/addresses/:id/edit */
export async function editAddress(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect('/account');
  }

  let { street, streetNumber, zipCode, floor, comments, latitude, longitude } = req.body;
  if (zipCode) zipCode = zipCode.replace(/\s+/g, '');

  try {
    await userModel.updateAddress(req.params.id, req.session.user.id, { street, streetNumber, zipCode, floor, comments, latitude, longitude });
    // Update session to reflect the changed address immediately
    req.session.deliveryAddress = { street, streetNumber, zipCode, latitude, longitude };
    req.flash('success', 'Η διεύθυνση ενημερώθηκε.');
  } catch (err) {
    console.error('Edit address error:', err);
    req.flash('error', 'Σφάλμα ενημέρωσης διεύθυνσης.');
  }
  res.redirect('/account');
}

/** POST /account/addresses/:id/delete */
export async function deleteAddress(req, res) {
  try {
    const owned = await userModel.checkAddressOwnership(req.params.id, req.session.user.id);
    if (!owned) {
      req.flash('error', 'Η διεύθυνση δεν βρέθηκε.');
      return res.redirect('/account');
    }
    await userModel.deleteAddress(req.params.id, req.session.user.id);
    req.flash('success', 'Η διεύθυνση διαγράφηκε.');
  } catch (err) {
    console.error('Delete address error:', err);
    req.flash('error', 'Σφάλμα διαγραφής διεύθυνσης.');
  }
  res.redirect('/account');
}

/** GET /track-orders */
export async function renderTrackOrders(req, res) {
  try {
    let orders = [];
    if (req.session.user && req.session.user.accountType === 'CUSTOMER') {
      const customerId = req.session.user.id;
      orders = await orderModel.getOrdersByCustomerId(customerId);
    } else if (req.session.guestOrderIds && req.session.guestOrderIds.length > 0) {
      orders = await orderModel.getOrdersByIds(req.session.guestOrderIds);
    }
    
    res.render('track-orders', { orders });
  } catch (err) {
    console.error('Track orders error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης παραγγελιών.' });
  }
}

async function buildNotificationsPayload(req) {
  const payload = {
    role: 'GUEST',
    hasPendingOrders: false,
    pendingOrderCount: 0,
    orders: []
  };

  if (req.session.user) {
    if (req.session.user.accountType === 'CUSTOMER') {
      payload.role = 'CUSTOMER';
      const orders = await orderModel.getOrdersByCustomerId(req.session.user.id);
      payload.orders = orders.map(order => ({
        id: order.id,
        status: order.status,
        restaurantName: order.restaurantName,
        created_at: order.created_at,
        completed_at: order.completed_at
      }));
      payload.pendingOrderCount = orders.filter(order => order.status === 'PENDING').length;
      payload.hasPendingOrders = payload.pendingOrderCount > 0;
    } else if (req.session.user.accountType === 'RESTAURANT') {
      payload.role = 'RESTAURANT';
      payload.pendingOrderCount = await orderModel.countPendingOrdersForRestaurant(req.session.user.id);
      payload.hasPendingOrders = payload.pendingOrderCount > 0;
    }
  } else if (req.session.guestOrderIds && req.session.guestOrderIds.length > 0) {
    payload.role = 'GUEST';
    const orders = await orderModel.getOrdersByIds(req.session.guestOrderIds);
    payload.orders = orders.map(order => ({
      id: order.id,
      status: order.status,
      restaurantName: order.restaurantName,
      created_at: order.created_at,
      completed_at: order.completed_at
    }));
    payload.pendingOrderCount = await orderModel.countPendingOrdersForGuest(req.session.guestOrderIds);
    payload.hasPendingOrders = payload.pendingOrderCount > 0;
  }

  return payload;
}

/** GET /api/notifications */
export async function getNotifications(req, res) {
  try {
    const payload = await buildNotificationsPayload(req);
    res.json(payload);
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Αποτυχία λήψης ειδοποιήσεων.' });
  }
}

/** GET /api/notifications/stream */
export async function streamNotifications(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let lastPayloadJson = '';
  const sendPayload = async () => {
    try {
      const payload = await buildNotificationsPayload(req);
      const payloadJson = JSON.stringify(payload);
      if (payloadJson !== lastPayloadJson) {
        lastPayloadJson = payloadJson;
        res.write(`data: ${payloadJson}\n\n`);
      } else {
        res.write(`: keep-alive\n\n`);
      }
    } catch (err) {
      console.error('Notifications stream error:', err);
      res.write(`: error\n\n`);
    }
  };

  // Send initial payload immediately
  await sendPayload();

  // Keep-alive heartbeat every 30 seconds
  const keepAliveInterval = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 30000);

  // Listen for order changes
  const onOrderChanged = () => {
    sendPayload();
  };
  appEvents.on('order:changed', onOrderChanged);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    appEvents.off('order:changed', onOrderChanged);
  });
}

/** POST /orders/:id/rate */
export async function rateOrder(req, res) {
  const { id } = req.params;
  const { rating } = req.body;
  const numericRating = parseFloat(rating);

  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    req.flash('error', 'Μη έγκυρη βαθμολογία.');
    return res.redirect('/track-orders');
  }

  try {
    // Check if user or guest "owns" this order
    let isOwner = false;
    if (req.session.user && req.session.user.accountType === 'CUSTOMER') {
      const orders = await orderModel.getOrdersByCustomerId(req.session.user.id);
      isOwner = orders.some(o => o.id == id);
    } else if (req.session.guestOrderIds) {
      isOwner = req.session.guestOrderIds.includes(parseInt(id));
    }

    if (!isOwner) {
      req.flash('error', 'Δεν έχετε δικαίωμα βαθμολόγησης αυτής της παραγγελίας.');
      return res.redirect('/track-orders');
    }

    const success = await orderModel.rateOrder(id, numericRating);
    if (success) {
      req.flash('success', 'Ευχαριστούμε για τη βαθμολογία σας!');
    } else {
      req.flash('error', 'Η παραγγελία έχει ήδη βαθμολογηθεί ή δεν βρέθηκε.');
    }
  } catch (err) {
    console.error('Rate order error:', err);
    req.flash('error', 'Σφάλμα κατά τη βαθμολόγηση.');
  }
  res.redirect('/track-orders');
}

