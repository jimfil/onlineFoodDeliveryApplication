import express from 'express';
import { query } from 'express-validator';
const router = express.Router();

import * as controller from '../controller/index-controller.mjs';

const browseValidation = [
  query('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  query('streetNumber').trim().escape().notEmpty().withMessage('Ο αριθμός είναι υποχρεωτικός'),
  query('zipCode').optional({ checkFalsy: true }).trim().isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός'),
  query('latitude').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Λανθασμένο γεωγραφικό πλάτος'),
  query('longitude').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Λανθασμένο γεωγραφικό μήκος')
];

router.get('/', controller.showLanding);
router.get('/browse', browseValidation, controller.showBrowse);

export default router;
