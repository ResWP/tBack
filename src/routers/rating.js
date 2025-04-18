import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  upsertRatingController,
  deleteRatingController,
  getRatingsForBookController,
  getRatingsByUserController,
} from '../controllers/rating.js';
import { authenticate } from '../middlewares/authenticate.js';
import { isValidId } from '../middlewares/isValidId.js';
import { ratingSchema } from '../validation/rating.js';
import { validateBody } from '../middlewares/validateBody.js';

const router = Router();

router.post(
  '/:bookId',
  isValidId,
  authenticate,
  validateBody(ratingSchema),
  ctrlWrapper(upsertRatingController),
);

router.delete(
  '/:bookId',
  isValidId,
  authenticate,
  ctrlWrapper(deleteRatingController),
);

router.get('/user', authenticate, ctrlWrapper(getRatingsByUserController));
router.get('/:bookId', isValidId, ctrlWrapper(getRatingsForBookController));

export default router;
