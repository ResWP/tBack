const parseBoolean = (value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

const parseNumber = (number) => {
  const isString = typeof number === 'string';
  if (!isString) return;

  const parsedNumber = parseInt(number);
  if (Number.isNaN(parsedNumber)) {
    return;
  }

  return parsedNumber;
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

  const parsedIsRated = parseBoolean(isRated);
  const parsedMaxYear = parseNumber(maxYear);
  const parsedMinYear = parseNumber(minYear);
  const parsedMaxAvgRating = parseNumber(maxAvgRating);
  const parsedMinAvgRating = parseNumber(minAvgRating);

  return {
    isRated: parsedIsRated,
    title: title,
    author: author,
    publisher: publisher,
    maxYear: parsedMaxYear,
    minYear: parsedMinYear,
    maxAvgRating: parsedMaxAvgRating,
    minAvgRating: parsedMinAvgRating,
  };
};
