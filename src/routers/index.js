import { Router } from 'express';
import authRouter from './auth.js';
import booksRouter from './book.js';
import ratingsRouter from './rating.js';

const router = Router();

router.use('/books', booksRouter);
router.use('/ratings', ratingsRouter);
router.use('/auth', authRouter);

export default router;
