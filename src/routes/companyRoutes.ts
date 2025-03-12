import express from "express";
import {
  createCompany,
  deleteCompany,
  updateCompany,
  updateSubscription,
} from "../controllers/companyController.js";
import { isAuthenticated } from "../middleware/index.js";

//! dont forget use middlewear
export default (router: express.Router) => {
  router.post("/company",isAuthenticated ,createCompany);
  router.delete("/company/:id", isAuthenticated,deleteCompany);
  router.put("/company/:id", isAuthenticated,updateCompany);
  router.put("/company/subscribe/:id", isAuthenticated,updateSubscription);
  return router;
};
