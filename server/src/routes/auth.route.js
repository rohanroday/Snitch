import Router from 'express';  
import {registerUser,loginUser,getMe} from '../controllers/auth.controller.js';
import { registerValidator,loginValidator } from '../validators/auth.validator.js';
import authenticate from '../middleware/auth.middleware.js';



const router= Router();

router.post('/register',registerValidator,registerUser);
router.post('/login',loginValidator,loginUser);
router.get('/me',authenticate,getMe);

export default router;
