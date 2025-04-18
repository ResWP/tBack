import { BooksCollection } from '../db/models/book.js';
import { RatingsCollection } from '../db/models/rating.js';

export const deleteRating = async ({ userId, bookId }) => {
  const rating = await RatingsCollection.findOneAndDelete({
    userId,
    bookId,
  });
  await BooksCollection.findByIdAndUpdate(rating.bookId, {
    $pull: { ratings: rating._id },
  });

  return rating;
};

export const upsertRating = async (payload) => {
  const { userId, bookId } = payload;

  const existingRating = await RatingsCollection.findOne({ userId, bookId });

  if (existingRating) {
    return await RatingsCollection.findByIdAndUpdate(
      existingRating._id,
      payload,
      { new: true },
    );
  } else {
    const newRating = await RatingsCollection.create(payload);

    await BooksCollection.findByIdAndUpdate(bookId, {
      $push: { ratings: newRating._id },
    });

    return newRating;
  }
};
/*
 * Fetches ratings for a specific user, merging them with book data.
 * @param {string} userId - The ID of the user whose ratings to fetch.
 * @returns {Promise<Array>} - A promise that resolves to an array of ratings for the specified user.
 */
export const getRatingsByUserWithBooks = async (userId) => {
  const ratings = await RatingsCollection.find({ userId }).toArray();

  const bookIds = ratings.map((rating) => rating.bookId);

  const books = await BooksCollection.find({ _id: { $in: bookIds } }).toArray();

  return ratings.map((rating) => ({
    ...rating,
    book: books.find((book) => book._id.toString() === rating.bookId),
  }));
};
export const getRatingsForBook = async (bookId) => {
  return await RatingsCollection.find({ bookId }).toArray();
};
