import express from 'express';
import morgan from 'morgan';
import authRouter from '../routes/auth.route.js';
import productRouter from '../routes/product.route.js';
import cartRouter from '../routes/cart.route.js';



const app = express();
app.use(express.json());
app.use(morgan('dev'));


app.use('/api/auth',authRouter);
app.use('/api/products',productRouter);
app.use('/api/cart',cartRouter);


export default app;