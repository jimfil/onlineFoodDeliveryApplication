import express from 'express';
const router = express.Router();

import * as controller from '../controller/restaurant-controller.mjs';
import { requireLogin, requireRestaurant } from '../middleware/session-auth.mjs';

// Public: view a restaurant menu
router.get('/restaurant/:id', controller.showRestaurant);

import { body } from 'express-validator';
const settingsValidation = [
  body('estimatedPreparationTime').optional({ checkFalsy: true }).isNumeric().withMessage('Ο χρόνος προετοιμασίας πρέπει να είναι αριθμός')
];

const addressValidation = [
  body('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  body('streetNumber').trim().isNumeric().withMessage('Ο αριθμός πρέπει να είναι αριθμητικός'),
  body('zipCode').optional({ checkFalsy: true }).customSanitizer(value => value.replace(/\s+/g, '')).isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός'),
  body('latitude').notEmpty().withMessage('Απαιτείται επιλογή διεύθυνσης από τον χάρτη').isFloat({ min: -90, max: 90 }).withMessage('Λανθασμένο γεωγραφικό πλάτος'),
  body('longitude').notEmpty().withMessage('Απαιτείται επιλογή διεύθυνσης από τον χάρτη').isFloat({ min: -180, max: 180 }).withMessage('Λανθασμένο γεωγραφικό μήκος')
];

// Restaurant admin panel (requires RESTAURANT role)
router.get ('/manage',                        requireLogin, requireRestaurant, controller.showManage);
router.post('/manage/products',               requireLogin, requireRestaurant, controller.addProduct);
router.post('/manage/products/:id/delete',    requireLogin, requireRestaurant, controller.deleteProduct);
router.post('/manage/products/:id/edit',      requireLogin, requireRestaurant, controller.editProduct);
router.post('/manage/settings',               requireLogin, requireRestaurant, settingsValidation, controller.updateSettings);
router.post('/manage/categories',             requireLogin, requireRestaurant, controller.updateCategories);
router.post('/manage/reorder',                requireLogin, requireRestaurant, controller.reorder);
router.get ('/manage/orders',                 requireLogin, requireRestaurant, controller.showManageOrders);
router.post('/manage/orders/:id/status',     requireLogin, requireRestaurant, controller.updateOrderStatus);
router.post('/manage/status',                 requireLogin, requireRestaurant, controller.toggleStatus);
router.post('/manage/icon',                   requireLogin, requireRestaurant, controller.updateIcon);
router.post('/manage/delete',                 requireLogin, requireRestaurant, controller.deleteRestaurant);
router.post('/manage/address',                requireLogin, requireRestaurant, addressValidation, controller.updateAddress);


export default router;
