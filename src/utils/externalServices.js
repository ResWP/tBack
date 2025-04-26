import axios from 'axios';
import createHttpError from 'http-errors';

export const fetchFromPythonBackend = async (endpoint, data) => {
  try {
    const response = await axios.post(
      `https://book-recommender-llg8.onrender.com${endpoint}`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error('Python backend error:', error);
    throw createHttpError(
      502,
      `Failed to fetch data from Python service ${error}
      \n for such data: ${JSON.stringify(data)}`,
    );
  }
};
