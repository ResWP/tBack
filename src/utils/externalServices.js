import axios from 'axios';
import createHttpError from 'http-errors';

export const fetchFromPythonBackend = async (endpoint, data) => {
  try {
    const response = await axios.post(
      `https://eec4418f-ae42-4787-ab9d-51c002077a53-00-1687l7bch1xsa.riker.replit.dev${endpoint}`,
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
