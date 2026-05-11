import express from 'express';
const router = express.Router();

import * as controller from '../controller/restaurant-controller.mjs';
import { requireLogin, requireRestaurant } from '../middleware/session-auth.mjs';

// Public: view a restaurant menu
router.get('/restaurant/:id', controller.showRestaurant);

// Restaurant admin panel (requires RESTAURANT role)
router.get ('/manage',                        requireLogin, requireRestaurant, controller.showManage);
router.post('/manage/products',               requireLogin, requireRestaurant, controller.addProduct);
router.post('/manage/products/:id/delete',    requireLogin, requireRestaurant, controller.deleteProduct);
router.post('/manage/settings',               requireLogin, requireRestaurant, controller.updateSettings);
router.post('/manage/reorder',                requireLogin, requireRestaurant, controller.reorder);
router.get ('/manage/orders',                 requireLogin, requireRestaurant, controller.showManageOrders);
router.post('/manage/orders/:id/status',     requireLogin, requireRestaurant, controller.updateOrderStatus);

export default router;
