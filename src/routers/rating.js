import { Router } from 'express';
import { ctrlWrapper } from '../utils/ctrlWrapper.js';
import {
  upsertRatingController,
  deleteRatingController,
  getRatingController,
  getRatingsByUserController,
} from '../controllers/rating.js';
import { authenticate } from '../middlewares/authenticate.js';
import { isValidId } from '../middlewares/isValidId.js';
import { ratingSchema } from '../validation/rating.js';
import { validateBody } from '../middlewares/validateBody.js';

const router = Router();

router.use(authenticate);

router.post(
  '/:bookId',
  isValidId,
  validateBody(ratingSchema),
  ctrlWrapper(upsertRatingController),
);
router.delete('/:bookId', isValidId, ctrlWrapper(deleteRatingController));
router.get('/user', ctrlWrapper(getRatingsByUserController));
router.get('/:bookId', isValidId, ctrlWrapper(getRatingController));

export default router;
