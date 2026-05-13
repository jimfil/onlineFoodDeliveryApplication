/**
 * controller/auth-controller.mjs
 * Login, register, logout handlers.
 */
import * as accountModel from '../model/account-model.mjs';
import { validationResult } from 'express-validator';

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
      contactPhone: user.contact_phone || null,
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mappedErrors = {};
    errors.array().forEach(err => {
      if (!mappedErrors[err.path]) mappedErrors[err.path] = err.msg;
    });
    return res.render('register', { errors: mappedErrors, userInput: req.body });
  }

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
      lastName:    newUser.lastName,
      contactPhone: newUser.contactPhone
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

/** GET /register-restaurant (Step 1) */
export async function showRegisterRestaurantStep1(req, res) {
  if (req.session.user) return res.redirect('/browse');
  // Load from session if they clicked "Back" from Step 2
  const userInput = req.session.restaurantRegStep1 || {};
  res.render('register-restaurant-step1', { userInput });
}

/** POST /register-restaurant/step1 */
export async function processRegisterRestaurantStep1(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mappedErrors = {};
    errors.array().forEach(err => {
      if (!mappedErrors[err.path]) mappedErrors[err.path] = err.msg;
    });
    return res.render('register-restaurant-step1', { errors: mappedErrors, userInput: req.body });
  }

  const { email } = req.body;
  try {
    const existing = await accountModel.findByEmail(email);
    if (existing) {
      req.flash('error', 'Το email χρησιμοποιείται ήδη.');
      return res.render('register-restaurant-step1', { userInput: req.body });
    }
    // Save to session and move to step 2
    req.session.restaurantRegStep1 = req.body;
    res.redirect('/register-restaurant/step2');
  } catch (err) {
    console.error('Step 1 error:', err);
    req.flash('error', 'Σφάλμα. Προσπαθήστε ξανά.');
    res.redirect('/register-restaurant');
  }
}

/** GET /register-restaurant/step2 */
export async function showRegisterRestaurantStep2(req, res) {
  if (!req.session.restaurantRegStep1) {
    return res.redirect('/register-restaurant');
  }
  const userInput = req.body || {};
  res.render('register-restaurant-step2', { userInput });
}

/** POST /register-restaurant/step2 */
export async function processRegisterRestaurantStep2(req, res) {
  if (!req.session.restaurantRegStep1) {
    return res.redirect('/register-restaurant');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const mappedErrors = {};
    errors.array().forEach(err => {
      if (!mappedErrors[err.path]) mappedErrors[err.path] = err.msg;
    });
    return res.render('register-restaurant-step2', { errors: mappedErrors, userInput: req.body });
  }

  const step1 = req.session.restaurantRegStep1;
  const { businessName, phone, afm, estimatedPreparationTime, minOrderValue, openingTime, closingTime, street, streetNumber, zipCode, latitude, longitude } = req.body;
  
  const operatingHours = `${openingTime}-${closingTime}`;

  try {
    const restaurant = await accountModel.registerRestaurant({
      email: step1.email,
      password: step1.password,
      firstNameOwner: step1.firstNameOwner,
      lastNameOwner: step1.lastNameOwner,
      businessName,
      phone,
      afm,
      estimatedPreparationTime,
      minOrderValue,
      operatingHours,
      street,
      streetNumber,
      zipCode,
      latitude,
      longitude
    });

    // Clear registration session
    delete req.session.restaurantRegStep1;

    req.session.user = {
      id:            restaurant.id,
      email:         restaurant.email,
      accountType:   'RESTAURANT',
      restaurantName: restaurant.businessName,
      firstName:     restaurant.firstNameOwner,
      lastName:      restaurant.lastNameOwner
    };

    req.flash('success', 'Καλωσήρθατε, ' + businessName + '!');
    res.redirect('/manage');
  } catch (err) {
    console.error('Step 2 error:', err);
    req.flash('error', 'Σφάλμα εγγραφής. Προσπαθήστε ξανά.');
    res.render('register-restaurant-step2', { userInput: req.body });
  }
}

/** GET /logout */
export async function logout(req, res) {
  req.session.destroy();
  res.redirect('/');
}
