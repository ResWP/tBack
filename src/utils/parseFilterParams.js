// FIXED: Enhanced parsing functions
const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

const parseNumber = (value, fallback = undefined) => {
  if (value === undefined || value === '') return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

// FIXED: Better float parsing for ratings
const parseFloatSafe = (value, fallback = undefined) => {
  if (value === undefined || value === '') return fallback;
  const num = Number.parseFloat(value); // explicitly use built-in parseFloat
  return isNaN(num) ? fallback : num;
};

export const parseFilterParams = (query) => {
  const {
    isRated,
    title,
    author,
    publisher,
    maxAvgRating,
    minAvgRating,
    minYear,
    maxYear,
  } = query;

  return {
    isRated: parseBoolean(isRated),
    title: title || undefined,
    author: author || undefined,
    publisher: publisher || undefined,
    minYear: parseNumber(minYear),
    maxYear: parseNumber(maxYear),
    minAvgRating: parseFloatSafe(minAvgRating),
    maxAvgRating: parseFloatSafe(maxAvgRating),
  };
};
