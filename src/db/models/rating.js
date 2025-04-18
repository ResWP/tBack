import { Schema, model } from 'mongoose';

const ratingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'book', required: true },
    rating: { type: Number, min: 1, max: 10, required: true },
    comment: { type: String, maxLength: 500 },
  },
  { timestamps: true, versionKey: false },
);

export const RatingsCollection = model('rating', ratingSchema);
