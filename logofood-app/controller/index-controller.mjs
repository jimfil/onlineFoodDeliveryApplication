/**
 * controller/index-controller.mjs
 * Landing page + browse restaurants.
 */
import * as restaurantModel from '../model/restaurant-model.mjs';
import * as userModel from '../model/user-model.mjs';
import { validationResult } from 'express-validator';
import { getDistanceKm } from '../utils/geo-utils.mjs';



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
    const errors = validationResult(req);
    const { street, streetNumber, zipCode, latitude, longitude, category, search } = req.query;

    // 1. If address in query, validate and save to session
    if (street || streetNumber || zipCode || latitude || longitude) {
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect('/');
      }
      req.session.deliveryAddress = {
        street,
        streetNumber,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      };
    }

    // 2. Check if we have an address (from session or user profile)
    let hasAddress = !!req.session.deliveryAddress;
    let addresses = [];

    if (req.session.user) {
      addresses = await userModel.getAddresses(req.session.user.id);
      if (addresses.length > 0) {
        hasAddress = true;
        // Default to the most recently updated address if none is selected
        if (!req.session.deliveryAddress) {
          const latest = addresses[0];
          req.session.deliveryAddress = {
            street: latest.street,
            streetNumber: latest.street_number,
            zipCode: latest.zip_code,
            latitude: latest.latitude,
            longitude: latest.longitude
          };
        }
      }
    }

    const deliveryCoords = req.session.deliveryAddress?.latitude != null && req.session.deliveryAddress?.longitude != null
      ? {
        lat: req.session.deliveryAddress.latitude,
        lon: req.session.deliveryAddress.longitude
      }
      : null;

    // Pagination
    const limit = 20;
    const page = Number.parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    let restaurants = [];
    let totalCount = 0;

    // Only fetch restaurants if we have valid delivery coordinates
    if (deliveryCoords) {
      restaurants = await restaurantModel.getAllRestaurants({
        lat: deliveryCoords.lat,
        lon: deliveryCoords.lon,
        limit,
        offset,
        category,
        search
      });
      totalCount = await restaurantModel.getRestaurantsCount({
        lat: deliveryCoords.lat,
        lon: deliveryCoords.lon,
        category,
        search
      });
    }

    const transformedRestaurants = restaurants.map(r => {
      const result = { ...r };
      const prepMinutes = Number.parseInt(r.estimated_preparation_time, 10) || 0;

      // Distance is already filtered <= 4km in SQL, but we calculate travel time here
      if (r.distanceKm != null) {
        result.distanceKm = Number(r.distanceKm.toFixed(1));
        const travelMinutes = Math.max(2, Math.round(r.distanceKm / 18 * 60));
        result.deliveryMinutes = prepMinutes + travelMinutes;
        result.travelMinutes = travelMinutes;
      }
      return result;
    });

    const totalPages = Math.ceil(totalCount / limit);
    const pagination = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      prevPage: page - 1,
      nextPage: page + 1,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1)
    };

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
      restaurants: transformedRestaurants,
      categories: categoriesWithEmoji,
      deliveryAddress: deliveryAddressStr,
      hasAddress,
      addresses,
      noAddress: !hasAddress,
      pagination,
      activeCategory: category || 'all',
      searchQuery: search || ''
    });
  } catch (err) {
    console.error('Browse error:', err);
    res.render('error', { message: 'Αδυναμία φόρτωσης εστιατορίων.' });
  }
}
