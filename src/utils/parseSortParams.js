import { SORT_ORDER } from '../constants/index.js';

const parseSortOrder = (sortOrder) => {
  const isKnownOrder = [SORT_ORDER.ASC, SORT_ORDER.DESC].includes(sortOrder);
  return isKnownOrder ? sortOrder : SORT_ORDER.ASC;
};

const parseSortBy = (sortBy) => {
  const validSortKeys = [
    '_id',
    'bookTitle',
    'bookAuthor',
    'publisher',
    'yearOfPublication',
    'isbn',
    'avgRating',
    'createdAt',
    'updatedAt',
  ];
  return validSortKeys.includes(sortBy) ? sortBy : '_id';
};

export const parseSortParams = (query) => {
  const { sortOrder, sortBy } = query;
  const parsedSortOrder = parseSortOrder(sortOrder);
  const parsedSortBy = parseSortBy(sortBy);

  const stringFields = ['bookTitle', 'bookAuthor', 'publisher'];
  const isStringField = stringFields.includes(parsedSortBy);

  const effectiveSortOrder = isStringField
    ? parsedSortOrder === SORT_ORDER.ASC
      ? SORT_ORDER.DESC
      : SORT_ORDER.ASC
    : parsedSortOrder;

  return {
    sortOrder: effectiveSortOrder,
    sortBy: parsedSortBy,
    isReversed: isStringField, // Optional flag for UI indication
  };
};
