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

  if (filter.minYear && filter.maxYear && filter.minYear > filter.maxYear) {
    [filter.minYear, filter.maxYear] = [filter.maxYear, filter.minYear];
  }

  if (filter.minYear || filter.maxYear) {
    matchConditions.yearOfPublication = {
      ...(filter.minYear && { $gte: filter.minYear }),
      ...(filter.maxYear && { $lte: filter.maxYear }),
    };
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
        avgRating: { $avg: '$ratings.rating' },
      },
    },
    ...(filter.minAvgRating || filter.maxAvgRating
      ? [
          {
            $match: {
              avgRating: {
                ...(filter.minAvgRating && { $gte: filter.minAvgRating }),
                ...(filter.maxAvgRating && { $lte: filter.maxAvgRating }),
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
    ...(filter.minAvgRating || filter.maxAvgRating
      ? [
          {
            $match: {
              avgRating: {
                ...(filter.minAvgRating && { $gte: filter.minAvgRating }),
                ...(filter.maxAvgRating && { $lte: filter.maxAvgRating }),
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

export const getSpecialBooks = async (data) => {
  try {
    const { age, city, _id: userId } = data;

    const userRatings = await RatingsCollection.find({ userId }).lean();
    if (userRatings.length === 0) {
      console.log('No ratings found for user, cannot generate recommendations');
      return userRatings;
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

    const response = await fetchFromPythonBackend('/recommendations', {
      ratings,
      age,
      city,
    });

    const { recommendations } = response;

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

    books.forEach((book) => {
      isbnToIdMap[book.ISBN] = book._id;
      normalizedIsbnToIdMap[book.ISBN.trim().replace(/-/g, '')] = book._id;
    });

    return recommendations.map((book) => {
      let bookId = isbnToIdMap[book.ISBN];

      if (!bookId) {
        const normalizedISBN = book.ISBN.trim().replace(/-/g, '');
        bookId = normalizedIsbnToIdMap[normalizedISBN];
      }

      return {
        ...book,
        _id: bookId || null,
      };
    });
  } catch (error) {
    console.error('Error in getSpecialBooks:', error);
    throw error;
  }
};

export const getRecentBooks = async (userId) => {
  const ratings = await RatingsCollection.find({ userId })
    .lean()
    .sort({ createdAt: -1 })
    .limit(10);
  const bookIds = ratings.map((rating) => rating.bookId);

  const books = await BooksCollection.find({ _id: { $in: bookIds } }).lean();

  return books;
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
