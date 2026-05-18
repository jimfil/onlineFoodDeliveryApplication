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

router.get ('/account',                    requireLogin, requireCustomer, controller.showAccount);
router.post('/account/profile',            requireLogin, requireCustomer, profileValidation, controller.updateProfile);
router.post('/account/addresses',          requireLogin, requireCustomer, controller.addAddress);
router.post('/account/addresses/:id/delete', requireLogin, requireCustomer, controller.deleteAddress);
router.post('/account/addresses/:id/edit',   requireLogin, requireCustomer, controller.editAddress);
router.get ('/api/notifications',         controller.getNotifications);
router.get ('/track-orders',                controller.renderTrackOrders);
router.post('/orders/:id/rate',              controller.rateOrder);

export default router;
