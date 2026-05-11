/**
 * controller/user-controller.mjs
 * Customer account & address management.
 */
import * as userModel from '../model/user-model.mjs';
import * as orderModel from '../model/order-model.mjs';

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

/** POST /account/addresses */
export async function addAddress(req, res) {
  const { street, streetNumber, zipCode, latitude, longitude, floor, comments } = req.body;
  try {
    await userModel.addAddress(req.session.user.id, { street, streetNumber, zipCode, latitude, longitude, floor, comments });
    req.flash('success', 'Η διεύθυνση προστέθηκε.');
  } catch (err) {
    console.error('Add address error:', err);
    req.flash('error', 'Σφάλμα προσθήκης διεύθυνσης.');
  }
  res.redirect('/account');
}

/** POST /account/addresses/:id/edit */
export async function editAddress(req, res) {
  const { street, streetNumber, zipCode, floor, comments, latitude, longitude } = req.body;
  try {
    await userModel.updateAddress(req.params.id, req.session.user.id, { street, streetNumber, zipCode, floor, comments, latitude, longitude });
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
    const customerId = req.session.user.id;
    const orders = await orderModel.getOrdersByCustomerId(customerId);
    res.render('track-orders', { orders });
  } catch (err) {
    console.error('Track orders error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης παραγγελιών.' });
  }
}
