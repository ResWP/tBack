import Joi from 'joi';

// Define Joi schema for rating validation
export const ratingSchema = Joi.object({
  rating: Joi.number().min(1).max(10).required().messages({
    'number.min': '"rating" must be at least 1',
    'number.max': '"rating" must be at most 10',
    'any.required': '"rating" is required',
  }),
  comment: Joi.string().max(500).allow(null, '').messages({
    'string.max': '"comment" must not exceed 500 characters',
  }),
});
