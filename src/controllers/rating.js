import createHttpError from 'http-errors';
import {
  upsertRating,
  deleteRating,
  getRatingsByUserWithBooks,
  getRating,
} from '../services/ratings.js';

export const upsertRatingController = async (req, res) => {
  const userId = req.user._id;
  const { bookId } = req.params;
  const rating = await upsertRating({ ...req.body, userId, bookId });
  res.status(201).json({ success: true, data: rating });
};
export const getRatingController = async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user._id;
  const rating = await getRating(bookId, userId);

  if (!rating) {
    throw createHttpError(404, 'rating not found');
  }

  res.json({
    status: 200,
    message: `Successfully found ratings for book with id ${bookId}!`,
    data: rating,
  });
};

export const getRatingsByUserController = async (req, res) => {
  const userId = req.user._id;

  const rating = await getRatingsByUserWithBooks(userId);

  if (!rating) {
    throw createHttpError(404, 'rating not found');
  }

  res.json({
    status: 200,
    message: `Successfully found ratings for book with id ${userId}!`,
    data: rating,
  });
};

export const deleteRatingController = async (req, res) => {
  const userId = req.user._id;
  const { bookId } = req.params;
  const rating = await deleteRating({ userId, bookId });
  if (!rating) {
    throw createHttpError(404, 'Rating not found');
  }

  res.status(204).json({ success: true, data: rating });
};
