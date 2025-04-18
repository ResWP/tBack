import mongoose from 'mongoose';
import { SORT_ORDER } from '../constants/index.js';
import { BooksCollection } from '../db/models/book.js';
import { RatingsCollection } from '../db/models/rating.js';
import { calculatePaginationData } from '../utils/calculatePaginationData.js';
import { fetchFromPythonBackend } from '../utils/externalServices.js';

export const getBooks = async ({
  page = 1,
  perPage = 10,
  sortOrder = SORT_ORDER.ASC,
  sortBy = '_id',
  filter = {},
  bookIds = null,
}) => {
  const limit = perPage;
  const skip = (page - 1) * perPage;

  const objectIdBookIds = bookIds
    ? bookIds.map((id) =>
        typeof id === 'string'
          ? mongoose.Types.ObjectId.createFromHexString(id)
          : id,
      )
    : null;

  const matchConditions = {
    ...(objectIdBookIds && { _id: { $in: objectIdBookIds } }),
    ...(filter.title && {
      bookTitle: { $regex: new RegExp(filter.title, 'i') },
    }),
    ...(filter.author && {
      bookAuthor: { $regex: new RegExp(filter.author, 'i') },
    }),
    ...(filter.publisher && {
      publisher: { $regex: new RegExp(filter.publisher, 'i') },
    }),
    ...(filter.maxYear && { yearOfPublication: { $lte: filter.maxYear } }),
    ...(filter.minYear && { yearOfPublication: { $gte: filter.minYear } }),
  };

  const booksQuery = BooksCollection.aggregate([
    { $match: matchConditions },
    {
      $lookup: {
        from: 'ratings',
        localField: '_id',
        foreignField: 'bookId',
        as: 'ratings',
      },
    },
    {
      $addFields: {
        avgRating: { $avg: '$ratings.rating' },
      },
    },
    ...(filter.maxAvgRating || filter.minAvgRating
      ? [
          {
            $match: {
              avgRating: {
                $gte: filter.minAvgRating || 0,
                $lte: filter.maxAvgRating || 10,
              },
            },
          },
        ]
      : []),
    {
      $unset: 'ratings',
    },
  ]);

  const countPipeline = [
    { $match: matchConditions },
    {
      $lookup: {
        from: 'ratings',
        localField: '_id',
        foreignField: 'bookId',
        as: 'ratings',
      },
    },
    {
      $addFields: {
        avgRating: { $avg: '$ratings.rating' },
      },
    },
    ...(filter.maxAvgRating || filter.minAvgRating
      ? [
          {
            $match: {
              avgRating: {
                $gte: filter.minAvgRating || 0,
                $lte: filter.maxAvgRating || 10,
              },
            },
          },
        ]
      : []),
    { $count: 'total' },
  ];

  const [countResult, books] = await Promise.all([
    BooksCollection.aggregate(countPipeline),
    booksQuery
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .exec(),
  ]);

  const booksCount = countResult.length > 0 ? countResult[0].total : 0;

  const paginationData = calculatePaginationData(booksCount, perPage, page);

  return {
    data: books,
    ...paginationData,
  };
};

export const getBookById = async (bookId) => {
  const book = await BooksCollection.aggregate([
    { $match: { _id: mongoose.Types.ObjectId.createFromHexString(bookId) } },
    {
      $lookup: {
        from: 'ratings',
        localField: '_id',
        foreignField: 'bookId',
        as: 'ratings',
      },
    },
    {
      $addFields: {
        avgRating: { $avg: '$ratings.rating' },
      },
    },
  ]);

  return book[0] || null;
};

// Analysis and Recommendations
export const getSpecialBooks = async (data) => {
  const { recommendations } = await fetchFromPythonBackend(
    '/api/recommendations',
    data,
  );

  // Normalize ISBNs (remove hyphens/whitespace)
  const isbns = recommendations.map((book) =>
    book.ISBN.trim().replace(/-/g, ''),
  );

  // Debug: Log ISBNs being queried
  console.log('Querying ISBNs:', isbns.slice(0, 5)); // First 5 for sanity check

  const books = await BooksCollection.find({
    ISBN: { $in: isbns },
  })
    .select('ISBN _id')
    .lean();

  // Debug: Log found books
  console.log('Found books:', books);

  // Create ISBN-to-_id map (case-sensitive exact match)
  const isbnToIdMap = {};
  books.forEach((book) => {
    isbnToIdMap[book.ISBN] = book._id;
  });

  // Merge _id into recommendations
  return recommendations.map((book) => {
    const normalizedISBN = book.ISBN.trim().replace(/-/g, '');
    return {
      ...book,
      _id: isbnToIdMap[normalizedISBN] || null, // Will be null only if ISBN is missing
    };
  });
};

export const getBestBooks = async () => {
  const books = await BooksCollection.aggregate([
    {
      $lookup: {
        from: 'ratings',
        localField: '_id',
        foreignField: 'bookId',
        as: 'ratings',
      },
    },
    {
      $addFields: {
        avgRating: {
          $cond: {
            if: { $gt: [{ $size: '$ratings' }, 0] },
            then: { $avg: '$ratings.rating' },
            else: null,
          },
        },
        ratingsCount: { $size: '$ratings' },
      },
    },
    {
      $addFields: {
        // Calculate the weighted score using Bayesian average
        // For books with ratings:
        //   (avgRating * ratingsCount + C * m) / (ratingsCount + m)
        // where C = 3.5 (default rating) and m = 10 (minimum ratings weight)
        weightedScore: {
          $cond: {
            if: { $gt: ['$ratingsCount', 0] },
            then: {
              $divide: [
                {
                  $add: [
                    { $multiply: ['$avgRating', '$ratingsCount'] },
                    { $multiply: [3.5, 10] }, // C=3.5, m=10
                  ],
                },
                { $add: ['$ratingsCount', 10] },
              ],
            },
            else: 0,
          },
        },
      },
    },
    { $sort: { weightedScore: -1, bookTitle: 1 } },
    { $limit: 10 },
    { $project: { ratings: 0 } },
  ]).exec();

  return books;
};

export const getRecentBooks = async (userId) => {
  const recentRatings = await RatingsCollection.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .exec();

  const bookIds = recentRatings.map((rating) => rating.bookId);
  return getBooksByIds(bookIds);
};
