import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const authenticate = async (req,res,next)=>{
    try{
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token,config.JWT_SECRET);
        req.user = decoded;
        next();
    }catch(err){
        res.status(400).json({message:'Error authenticating user',error:err.message});
    }
}
export default authenticate;
