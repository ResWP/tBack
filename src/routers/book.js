import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';

import {
  getBookByIdController,
  getBooksController,
  getSpecialBooksController,
  getBestBooksController,
  getRecentBooksController,
} from '../controllers/book.js';
import { isValidId } from '../middlewares/isValidId.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

router.get('/', ctrlWrapper(getBooksController));
router.get('/best', ctrlWrapper(getBestBooksController));
router.use(authenticate);
router.get('/recent', ctrlWrapper(getRecentBooksController));
router.get('/special', ctrlWrapper(getSpecialBooksController));
router.get('/:bookId', isValidId, ctrlWrapper(getBookByIdController));

export default router;
