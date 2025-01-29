import { isAuthenticated } from "../middleware/index.js";
import {
  createBulk,
  deleteBulk,
  fetchAllBulk,
  insertBatchAndVouchers,
} from "../controllers/bulk.js";

import express from "express";

export default (router: express.Router) => {
  router.post("/bulk", createBulk);
  router.get("/bulk", isAuthenticated, fetchAllBulk);
  router.delete("/bulk/:id", deleteBulk);
  router.post("/generate", insertBatchAndVouchers);
};
