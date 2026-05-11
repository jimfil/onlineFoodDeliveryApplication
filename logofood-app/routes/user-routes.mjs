import express from 'express';
const router = express.Router();

import * as controller from '../controller/user-controller.mjs';
import { requireLogin, requireCustomer } from '../middleware/session-auth.mjs';

router.get ('/account',                    requireLogin, requireCustomer, controller.showAccount);
router.post('/account/profile',            requireLogin, requireCustomer, controller.updateProfile);
router.post('/account/addresses',          requireLogin, requireCustomer, controller.addAddress);
router.post('/account/addresses/:id/delete', requireLogin, requireCustomer, controller.deleteAddress);

export default router;
