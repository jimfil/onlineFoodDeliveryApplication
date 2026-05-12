import express from 'express';
import { body } from 'express-validator';
const router = express.Router();

import * as controller from '../controller/auth-controller.mjs';

const customerValidation = [
  body('firstName').trim().escape().notEmpty().withMessage('Το όνομα είναι υποχρεωτικό'),
  body('lastName').trim().escape().notEmpty().withMessage('Το επώνυμο είναι υποχρεωτικό'),
  body('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  body('streetNumber').trim().isNumeric().withMessage('Ο αριθμός πρέπει να είναι αριθμητικός'),
  body('zipCode').customSanitizer(value => value.replace(/\s+/g, '')).isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός'),
  body('email').trim().isEmail().withMessage('Εισάγετε ένα έγκυρο email'),
  body('password').isLength({ min: 6 }).withMessage('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
  body('contactPhone').trim().matches(/^[26]\d{9}$/).withMessage('Εισάγετε ένα έγκυρο τηλέφωνο επικοινωνίας (π.χ. 69... ή 210...)')
];

const restaurantStep1Validation = [
  body('firstNameOwner').trim().escape().notEmpty().withMessage('Το όνομα ιδιοκτήτη είναι υποχρεωτικό'),
  body('lastNameOwner').trim().escape().notEmpty().withMessage('Το επώνυμο ιδιοκτήτη είναι υποχρεωτικό'),
  body('email').trim().isEmail().withMessage('Εισάγετε ένα έγκυρο email'),
  body('password').isLength({ min: 6 }).withMessage('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες')
];

const restaurantStep2Validation = [
  body('businessName').trim().escape().notEmpty().withMessage('Η επωνυμία επιχείρησης είναι υποχρεωτική'),
  body('afm').trim().isLength({ min: 9, max: 9 }).withMessage('Το ΑΦΜ πρέπει να έχει 9 ψηφία').isNumeric().withMessage('Το ΑΦΜ πρέπει να περιέχει μόνο αριθμούς'),
  body('phone').trim().matches(/^[26]\d{9}$/).withMessage('Εισάγετε ένα έγκυρο τηλέφωνο επικοινωνίας'),
  body('estimatedPreparationTime').trim().isNumeric().withMessage('Ο χρόνος προετοιμασίας πρέπει να είναι αριθμός'),
  body('openingTime').notEmpty().withMessage('Η ώρα έναρξης είναι υποχρεωτική'),
  body('closingTime').notEmpty().withMessage('Η ώρα λήξης είναι υποχρεωτική'),
  body('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  body('streetNumber').trim().isNumeric().withMessage('Ο αριθμός πρέπει να είναι αριθμητικός'),
  body('zipCode').customSanitizer(value => value.replace(/\s+/g, '')).isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός')
];

router.get ('/login',                        controller.showLogin);
router.post('/login',                        controller.processLogin);
router.get ('/register',                     controller.showRegister);
router.post('/register',                     customerValidation, controller.processRegister);

// Restaurant Registration - Step 1
router.get ('/register-restaurant',          controller.showRegisterRestaurantStep1);
router.post('/register-restaurant/step1',    restaurantStep1Validation, controller.processRegisterRestaurantStep1);

// Restaurant Registration - Step 2
router.get ('/register-restaurant/step2',    controller.showRegisterRestaurantStep2);
router.post('/register-restaurant/step2',    restaurantStep2Validation, controller.processRegisterRestaurantStep2);
router.get ('/logout',              controller.logout);

export default router;
