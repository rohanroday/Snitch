import mongoose from 'mongoose';
import config from './config.js';

export async function connectDB() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');
}
