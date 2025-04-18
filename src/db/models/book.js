import { model, Schema } from 'mongoose';

const bookSchema = new Schema(
  {
    ISBN: { type: String, required: true, unique: true },
    bookTitle: { type: String, required: true },
    bookAuthor: { type: String, required: true },
    yearOfPublication: { type: Number },
    publisher: { type: String },
    imageUrlS: { type: String },
    imageUrlM: { type: String },
    imageUrlL: { type: String },
    ratings: [{ type: Schema.Types.ObjectId, ref: 'rating' }],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const BooksCollection = model('book', bookSchema);
