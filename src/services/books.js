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

  const matchConditions = {};

  if (objectIdBookIds) {
    matchConditions._id = { $in: objectIdBookIds };
  }

  if (filter.title) {
    matchConditions.bookTitle = { $regex: new RegExp(filter.title, 'i') };
  }

  if (filter.author) {
    matchConditions.bookAuthor = { $regex: new RegExp(filter.author, 'i') };
  }

  if (filter.publisher) {
    matchConditions.publisher = { $regex: new RegExp(filter.publisher, 'i') };
  }

  // FIXED: Year range filtering
  if (filter.minYear !== undefined || filter.maxYear !== undefined) {
    // Auto-swap if min > max
    let minYear = filter.minYear;
    let maxYear = filter.maxYear;

    if (minYear !== undefined && maxYear !== undefined && minYear > maxYear) {
      [minYear, maxYear] = [maxYear, minYear];
    }

    matchConditions.yearOfPublication = {};
    if (minYear !== undefined) {
      matchConditions.yearOfPublication.$gte = minYear;
    }
    if (maxYear !== undefined) {
      matchConditions.yearOfPublication.$lte = maxYear;
    }
  }

  // FIXED: Build rating filter conditions for second match stage
  const ratingMatchConditions = {};
  if (filter.minAvgRating !== undefined || filter.maxAvgRating !== undefined) {
    ratingMatchConditions.avgRating = {};
    if (filter.minAvgRating !== undefined) {
      ratingMatchConditions.avgRating.$gte = filter.minAvgRating;
    }
    if (filter.maxAvgRating !== undefined) {
      ratingMatchConditions.avgRating.$lte = filter.maxAvgRating;
    }
  }

  // FIXED: Add isRated filter support
  if (filter.isRated !== undefined) {
    if (filter.isRated) {
      // Only books that have ratings
      ratingMatchConditions.avgRating = {
        ...ratingMatchConditions.avgRating,
        $exists: true,
        $ne: null,
      };
    } else {
      // Only books without ratings
      ratingMatchConditions.$or = [
        { avgRating: { $exists: false } },
        { avgRating: null },
      ];
    }
  }

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
        avgRating: {
          $cond: {
            if: { $gt: [{ $size: '$ratings' }, 0] },
            then: { $avg: '$ratings.rating' },
            else: null,
          },
        },
      },
    },
    // FIXED: Apply rating filters only if they exist
    ...(Object.keys(ratingMatchConditions).length > 0
      ? [{ $match: ratingMatchConditions }]
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
        avgRating: {
          $cond: {
            if: { $gt: [{ $size: '$ratings' }, 0] },
            then: { $avg: '$ratings.rating' },
            else: null,
          },
        },
      },
    },
    // FIXED: Apply rating filters only if they exist
    ...(Object.keys(ratingMatchConditions).length > 0
      ? [{ $match: ratingMatchConditions }]
      : []),
    { $count: 'total' },
  ];

  const [countResult, books] = await Promise.all([
    BooksCollection.aggregate(countPipeline),
    booksQuery
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
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

export const getSpecialBooks = async (user) => {
  try {
    const { _id: userId } = user;

    const userRatings = await RatingsCollection.find({ userId }).lean();
    if (userRatings.length < 5) {
      console.log(
        'Not enough ratings found for user, cannot generate recommendations',
      );
      return [];
    }

    const bookIds = userRatings.map((rating) => rating.bookId);

    const ratedBooks = await BooksCollection.find({
      _id: { $in: bookIds },
    })
      .select('ISBN _id title')
      .lean();
    const ratings = new Map();
    userRatings.forEach((rating, index) => {
      let isbn = ratedBooks[index].ISBN.toString();
      ratings[isbn] = rating.rating;
    });

    const response = await fetchFromPythonBackend('/recommend', {
      ratings,
    });

    const { recommendations } = response;
    // return recommendations;
    if (
      !recommendations ||
      !Array.isArray(recommendations) ||
      recommendations.length === 0
    ) {
      console.log('No recommendations returned from API');
      return ['No recommendations returned from API'];
    }

    console.log(`Received ${recommendations.length} recommendations`);

    const normalizedRecommendationIsbns = recommendations.map((book) =>
      book.ISBN.trim().replace(/-/g, ''),
    );

    const books = await BooksCollection.find({
      $or: [
        { ISBN: { $in: recommendations.map((book) => book.ISBN) } },
        { normalizedISBN: { $in: normalizedRecommendationIsbns } },
      ],
    }).lean();

    console.log(`Found ${books.length} matching books in database`);

    const isbnToIdMap = {};
    const normalizedIsbnToIdMap = {};

    // Create maps for efficient lookup
    books.forEach((book) => {
      isbnToIdMap[book.ISBN] = book; // Store the entire book object
      normalizedIsbnToIdMap[book.ISBN.trim().replace(/-/g, '')] = book; // Store the entire book object
    });

    return recommendations.map((recBook) => {
      let book = isbnToIdMap[recBook.ISBN];
      if (!book) {
        const normalizedISBN = recBook.ISBN.trim().replace(/-/g, '');
        book = normalizedIsbnToIdMap[normalizedISBN];
      }
      return book ? { ...recBook, ...book } : { ...recBook }; //return the whole book
    });
  } catch (error) {
    console.error('Error in getSpecialBooks:', error);
    throw error;
  }
};

export const getRecentBooks = async (userId) => {
  return await RatingsCollection.aggregate([
    { $match: { userId } },
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'books',
        localField: 'bookId',
        foreignField: '_id',
        as: 'book',
      },
    },
    { $unwind: '$book' },
    { $replaceRoot: { newRoot: '$book' } },
  ]);
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
