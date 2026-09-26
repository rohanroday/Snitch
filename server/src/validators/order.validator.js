import { body } from "express-validator";
import { validateRequest } from "../utils/validate.js";

export const createOrderValidator = [
  body("address.state").trim().notEmpty().withMessage("State is required"),
  body("address.city").trim().notEmpty().withMessage("City is required"),
  body("address.street").trim().notEmpty().withMessage("Street is required"),
  body("address.zip").trim().notEmpty().withMessage("Zip code is required"),
  body("address.house").trim().notEmpty().withMessage("House is required"),
  validateRequest,
];