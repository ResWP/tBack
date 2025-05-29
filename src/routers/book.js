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
router.get('/:bookId', isValidId, ctrlWrapper(getBookByIdController));
router.use(authenticate);
router.post('/special', ctrlWrapper(getSpecialBooksController));
router.post('/recent', ctrlWrapper(getRecentBooksController));

export default router;
