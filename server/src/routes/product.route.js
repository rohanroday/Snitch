import Router from 'express';
import {createProduct,updateProduct,getProducts,togglePublishProduct,deleteImage,getProductsBySeller} from '../controllers/product.controller.js';
import {createProductValidator,updateProductValidator} from "../validators/product.validator.js"
import authenticate from "../middleware/auth.middleware.js"
import multer from "multer";

const upload = multer({storage:multer.memoryStorage()})

const router= Router();
router.post("/create",authenticate,upload.array("images",5),    
    (req,res,next)=>{
        if(req.body.category){
            req.body.category = JSON.parse(req.body.category);
        }
        if(req.body.sizes){
            req.body.sizes = JSON.parse(req.body.sizes);
        }
        if(req.body.price){
            req.body.price = JSON.parse(req.body.price);
        }
        next();
    },createProductValidator,createProduct);

    router.patch("/update/:id",authenticate,upload.array("images",5),    
    (req,res,next)=>{
        if(req.body.category){
            req.body.category = JSON.parse(req.body.category);
        }
        if(req.body.sizes){
            req.body.sizes = JSON.parse(req.body.sizes);
        }
        if(req.body.price){
            req.body.price = JSON.parse(req.body.price);
        }
        next();
    },
    updateProductValidator,
    updateProduct);


    router.get("/",getProducts);

    router.patch("/publish/:id",authenticate,togglePublishProduct);

    router.delete("/image/:id/:imageId",authenticate,deleteImage);

    router.get("/seller",authenticate,getProductsBySeller);

export default router;
