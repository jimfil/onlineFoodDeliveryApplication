import express from 'express';
const router = express.Router();

import * as controller from '../controller/index-controller.mjs';

router.get('/',       controller.showLanding);
router.get('/browse', controller.showBrowse);

export default router;
