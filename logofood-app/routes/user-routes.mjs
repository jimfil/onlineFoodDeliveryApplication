import express from 'express';
import { body } from 'express-validator';
const router = express.Router();

import * as controller from '../controller/user-controller.mjs';
import { requireLogin, requireCustomer } from '../middleware/session-auth.mjs';

const profileValidation = [
  body('contactPhone')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Το τηλέφωνο πρέπει να περιέχει ακριβώς 10 ψηφία χωρίς κενά ή σύμβολα.')
];

const addressValidation = [
  body('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  body('streetNumber').trim().isNumeric().withMessage('Ο αριθμός πρέπει να είναι αριθμητικός'),
  body('zipCode').optional({ checkFalsy: true }).customSanitizer(value => value.replace(/\s+/g, '')).isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός'),
  body('latitude').notEmpty().withMessage('Απαιτείται επιλογή διεύθυνσης από τον χάρτη').isFloat({ min: -90, max: 90 }).withMessage('Λανθασμένο γεωγραφικό πλάτος'),
  body('longitude').notEmpty().withMessage('Απαιτείται επιλογή διεύθυνσης από τον χάρτη').isFloat({ min: -180, max: 180 }).withMessage('Λανθασμένο γεωγραφικό μήκος')
];

router.get ('/account',                    requireLogin, requireCustomer, controller.showAccount);
router.post('/account/profile',            requireLogin, requireCustomer, profileValidation, controller.updateProfile);
router.post('/account/delete',             requireLogin, requireCustomer, controller.deleteAccount);
router.post('/account/addresses',          requireLogin, requireCustomer, addressValidation, controller.addAddress);
router.post('/account/addresses/:id/delete', requireLogin, requireCustomer, controller.deleteAddress);
router.post('/account/addresses/:id/edit',   requireLogin, requireCustomer, addressValidation, controller.editAddress);
router.get ('/api/notifications',         controller.getNotifications);
router.get ('/api/notifications/stream',    controller.streamNotifications);
router.get ('/track-orders',                controller.renderTrackOrders);
router.post('/orders/:id/rate',              controller.rateOrder);

export default router;
