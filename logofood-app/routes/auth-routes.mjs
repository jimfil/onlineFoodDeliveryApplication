import express from 'express';
const router = express.Router();

import * as controller from '../controller/auth-controller.mjs';

router.get ('/login',               controller.showLogin);
router.post('/login',               controller.processLogin);
router.get ('/register',            controller.showRegister);
router.post('/register',            controller.processRegister);
router.get ('/register-restaurant', controller.showRegisterRestaurant);
router.post('/register-restaurant', controller.processRegisterRestaurant);
router.get ('/logout',              controller.logout);

export default router;
