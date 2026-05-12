import express from 'express';
import { query } from 'express-validator';
const router = express.Router();

import * as controller from '../controller/index-controller.mjs';

const browseValidation = [
  query('street').trim().escape().notEmpty().withMessage('Η οδός είναι υποχρεωτική'),
  query('streetNumber').trim().escape().notEmpty().withMessage('Ο αριθμός είναι υποχρεωτικός'),
  query('zipCode').optional({ checkFalsy: true }).trim().isNumeric().withMessage('Ο Τ.Κ. πρέπει να είναι αριθμητικός')
];

router.get('/', controller.showLanding);
router.get('/browse', browseValidation, controller.showBrowse);

export default router;
