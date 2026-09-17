import { body, param } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const addToCartValidator = [
  param("productId").isMongoId().withMessage("Imvalid Product ID"),
  body("size")
    .isIn(["XS", "S", "M", "L", "XL", "XXL"])
    .withMessage("Invalid Size")
    .notEmpty()
    .withMessage("Size is required"),
  body("quantity").notEmpty().withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be greater than 0"),
    validateRequest
];


export const removeCartValidator = addToCartValidator;