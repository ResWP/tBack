import createHttpError from 'http-errors';
import {
  getBookById,
  getBooks,
  getSpecialBooks,
  getBestBooks,
  getRecentBooks,
} from '../services/books.js';
import { parseFilterParams } from '../utils/parseFilterParams.js';
import { parsePaginationParams } from '../utils/parsePaginationParams.js';
import { parseSortParams } from '../utils/parseSortParams.js';

export const getBooksController = async (req, res) => {
  const { page, perPage } = parsePaginationParams(req.query);
  const { sortBy, sortOrder } = parseSortParams(req.query);
  const { bookIds } = req.body;
  const filter = parseFilterParams(req.query);

  const books = await getBooks({
    page,
    perPage,
    sortBy,
    sortOrder,
    filter,
    bookIds,
  });

  res.json({
    status: 200,
    message: 'Successfully found books!',
    data: books,
  });
};

export const getBookByIdController = async (req, res) => {
  const { bookId } = req.params;

  const book = await getBookById(bookId);
  if (!book) {
    throw createHttpError(404, 'Book not found');
  }

  res.json({
    status: 200,
    message: `Successfully found book with id ${bookId}!`,
    data: book,
  });
};

// Analysis and Recommendations
export const getSpecialBooksController = async (req, res) => {
  const books = await getSpecialBooks(req.user);

  res.json({
    status: 200,
    message: 'Successfully found special books!',
    data: books,
  });
};

export const getRecentBooksController = async (req, res) => {
  const userId = req.user._id;
  const books = await getRecentBooks(userId);

  res.json({
    status: 200,
    message: 'Successfully found recently rated books!',
    data: books,
  });
};

export const getBestBooksController = async (req, res) => {
  const books = await getBestBooks();

  res.json({
    status: 200,
    message: 'Successfully found best rated books!',
    data: books,
  });
};
