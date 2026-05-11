/**
 * controller/index-controller.mjs
 * Landing page + browse restaurants.
 */
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as userModel from '../model/user-model.mjs';

/** GET / — render landing page */
export async function showLanding(req, res) {
  // If user is a restaurant, redirect them to their dashboard
  if (req.session?.user?.accountType === 'RESTAURANT') {
    return res.redirect('/manage');
  }
  res.render('index');
}

/** GET /browse — fetch all restaurants, render browse page */
export async function showBrowse(req, res) {
  if (req.session?.user?.accountType === 'RESTAURANT') {
    return res.redirect('/manage');
  }
  try {
    const { street, streetNumber, zipCode } = req.query;

    // 1. If address in query, save to session
    if (street && streetNumber) {
      req.session.deliveryAddress = { street, streetNumber, zipCode };
    }

    // 2. Check if we have an address (from session or user profile)
    let hasAddress = !!req.session.deliveryAddress;
    let addresses = [];

    if (req.session.user) {
      addresses = await userModel.getAddresses(req.session.user.id);
      if (addresses.length > 0) hasAddress = true;
    }

    const restaurants = await restaurantModel.getAllRestaurants();
    const categories = await restaurantModel.getAllRestaurantCategories();

    // Emoji mapping for categories
    const emojiMap = {
      'Burger': '🍔',
      'American': '🌭',
      'Fast Food': '🍟',
      'Healthy': '🥬',
      'Italian': '🍝',
      'Seafood': '🐟',
      'Brunch': '☕',
      'Pizza': '🍕',
      'Mexican': '🌮',
      'Asian': '🍜',
      'Σουβλάκια': '🍢',
      'Ψητά Σχάρας': '🥩',
      //gia future use: 
      'Sushi': '🍣',
      'Pasta': '🍝',
      'Salads': '🥗',
      'Desserts': '🍰',
      'Coffee': '☕',
      'Crepes': '🥞'
    };

    const categoriesWithEmoji = categories.map(cat => ({
      ...cat,
      emoji: emojiMap[cat.name] || '🍴'
    }));

    const deliveryAddressStr = req.session.deliveryAddress
      ? `${req.session.deliveryAddress.street} ${req.session.deliveryAddress.streetNumber}`
      : (addresses.length > 0 ? `${addresses[0].street} ${addresses[0].street_number}` : null);

    res.render('browse', {
      restaurants,
      categories: categoriesWithEmoji,
      deliveryAddress: deliveryAddressStr,
      hasAddress,
      addresses,
      noAddress: !hasAddress
    });
  } catch (err) {
    console.error('Browse error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης εστιατορίων.' });
  }
}
