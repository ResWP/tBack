import { isValidObjectId } from 'mongoose';
import createHttpError from 'http-errors';

export const isValidId = (req, res, next) => {
  const { bookId } = req.params;
  if (!isValidObjectId(bookId)) {
    throw createHttpError(400, 'Bad Request');
  }

  next();
};
