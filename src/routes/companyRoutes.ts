import express from "express";
import {
  createCompany,
  deleteCompany,
  updateCompany,
  updateSubscription,
} from "../controllers/companyController.js";

//! dont forget use middlewear
export default (router: express.Router) => {
  router.post("/company", createCompany);
  router.delete("/company/:id", deleteCompany);
  router.put("/company/:id", updateCompany);
  router.put("/company/subscribe/:id", updateSubscription);
  return router;
};
