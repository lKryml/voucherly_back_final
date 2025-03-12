import { isAuthenticated } from "../middleware/index.js";
import {
  createBulk,
  deleteBulk,
  fetchAllBulk,
  insertBatchAndVouchers,
  getBatches,
  updateBatchAndVouchers,
} from "../controllers/bulk.js";

import express from "express";

export default (router: express.Router) => {
  router.post("/bulk", isAuthenticated,createBulk);
  router.get("/bulk", isAuthenticated, fetchAllBulk);
  router.delete("/bulk/:id", isAuthenticated,deleteBulk);
  router.post("/generate", isAuthenticated,insertBatchAndVouchers);
  router.get('/batches', isAuthenticated,getBatches);
  router.put('/batches/:id', isAuthenticated,updateBatchAndVouchers);

};
