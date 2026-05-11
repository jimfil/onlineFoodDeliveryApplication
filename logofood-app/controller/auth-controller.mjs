/**
 * controller/auth-controller.mjs
 * Login, register, logout handlers.
 */
import * as accountModel from '../model/account-model.mjs';

/** GET /login */
export async function showLogin(req, res) {
  if (req.session.user) return res.redirect('/browse');
  res.render('login');
}

/** POST /login */
export async function processLogin(req, res) {
  const { email, password } = req.body;
  try {
    const user = await accountModel.findWithProfileByEmail(email);
    if (!user) {
      req.flash('error', 'Λανθασμένο email ή κωδικός.');
      return res.redirect('/login');
    }
    const valid = await accountModel.verifyPassword(password, user.password_hashed);
    if (!valid) {
      req.flash('error', 'Λανθασμένο email ή κωδικός.');
      return res.redirect('/login');
    }

    // Build session user object
    req.session.user = {
      id:           user.id,
      email:        user.email,
      accountType:  user.account_type,
      firstName:    user.first_name || null,
      lastName:     user.last_name  || null,
      restaurantName: user.restaurant_name || null,
      preparationTime: user.estimated_preparation_time || null
    };

    // Clear any guest address on login
    delete req.session.deliveryAddress;

    if (user.account_type === 'RESTAURANT') {
      return res.redirect('/manage');
    }
    res.redirect('/browse');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Εσωτερικό σφάλμα. Προσπαθήστε ξανά.');
    res.redirect('/login');
  }
}

/** GET /register */
export async function showRegister(req, res) {
  if (req.session.user) return res.redirect('/browse');
  res.render('register');
}

/** POST /register */
export async function processRegister(req, res) {
  const { email, password, firstName, lastName, contactPhone,
          street, streetNumber, zipCode } = req.body;
  try {
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      req.flash('error', 'Το email χρησιμοποιείται ήδη.');
      return res.redirect('/register');
    }
    const newUser = await accountModel.registerCustomer({
      email, password, firstName, lastName, contactPhone,
      street, streetNumber, zipCode
    });
    req.session.user = {
      id:          newUser.id,
      email:       newUser.email,
      accountType: 'CUSTOMER',
      firstName:   newUser.firstName,
      lastName:    newUser.lastName
    };
    // Clear guest address on register
    delete req.session.deliveryAddress;

    req.flash('success', 'Καλωσήρθατε, ' + firstName + '!');
    res.redirect('/browse');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Σφάλμα εγγραφής. Προσπαθήστε ξανά.');
    res.redirect('/register');
  }
}

/** GET /register-restaurant */
export async function showRegisterRestaurant(req, res) {
  if (req.session.user) return res.redirect('/browse');
  res.render('register-restaurant');
}

/** POST /register-restaurant */
export async function processRegisterRestaurant(req, res) {
  const { email, password, businessName, firstNameOwner, lastNameOwner, phone, afm } = req.body;
  try {
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      req.flash('error', 'Το email χρησιμοποιείται ήδη.');
      return res.redirect('/register-restaurant');
    }
    const restaurant = await accountModel.registerRestaurant({
      email, password, businessName, firstNameOwner, lastNameOwner, phone, afm
    });
    req.session.user = {
      id:            restaurant.id,
      email:         restaurant.email,
      accountType:   'RESTAURANT',
      restaurantName: restaurant.businessName
    };
    req.flash('success', 'Το εστιατόριό σας καταχωρήθηκε!');
    res.redirect('/manage');
  } catch (err) {
    console.error('Restaurant register error:', err);
    req.flash('error', 'Σφάλμα εγγραφής. Προσπαθήστε ξανά.');
    res.redirect('/register-restaurant');
  }
}

/** GET /logout */
export async function logout(req, res) {
  req.session.destroy();
  res.redirect('/');
}
