import dotenv from 'dotenv';
dotenv.config();

const config = {
  MONGODB_URI: process.env.MONGODB_URI,
  IMAGEKIT_API_KEY: process.env.IMAGEKIT_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
};

export default config;