import express from 'express';
const router = express.Router();

import * as controller from '../controller/cart-controller.mjs';

router.get ('/cart',          controller.showCart);
router.get ('/cart/count',    controller.cartCount);
router.post('/cart/add',      controller.addToCart);
router.post('/cart/remove',   controller.removeFromCart);
router.post('/cart/delete',   controller.deleteFromCart);
router.post('/cart/checkout', controller.checkout);

export default router;
