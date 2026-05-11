/**
 * middleware/session-auth.mjs
 * Route guard middleware for session-based auth.
 */

/** Redirect to /login if no session user. */
export function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Παρακαλώ συνδεθείτε για να συνεχίσετε.');
  res.redirect('/login');
}

/** Redirect if user is not a restaurant account. */
export function requireRestaurant(req, res, next) {
  if (req.session?.user?.accountType === 'RESTAURANT') return next();
  req.flash('error', 'Δεν έχετε πρόσβαση σε αυτή τη σελίδα.');
  res.redirect('/');
}

/** Redirect if user is not a customer account. */
export function requireCustomer(req, res, next) {
  if (req.session?.user?.accountType === 'CUSTOMER') return next();
  req.flash('error', 'Η σελίδα αυτή είναι μόνο για πελάτες.');
  res.redirect('/');
}
