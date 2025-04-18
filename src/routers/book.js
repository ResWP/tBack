import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
// import { validateBody } from '../middlewares/validateBody.js';
import {
  getBookByIdController,
  // getBooksByIdsController,
  getBooksController,
  getSpecialBooksController,
  getBestBooksController,
  getRecentBooksController,
} from '../controllers/book.js';
import { isValidId } from '../middlewares/isValidId.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

router.get('/', ctrlWrapper(getBooksController));
router.get('/special', getSpecialBooksController);
router.get('/best', getBestBooksController);
router.get('/recent', authenticate, getRecentBooksController);
router.get('/:bookId', isValidId, ctrlWrapper(getBookByIdController));

export default router;
