import { isAuthenticated } from "../middleware/index.js";
import {
  createDistributor,
  deleteDistributor,
  fetchAllDistrbutor,
  updateDistributor,
  orderDistrbutorsByName,
} from "../controllers/distributor.js";
import express from "express";

export default (router: express.Router) => {
  router.post("/distributor", isAuthenticated, createDistributor);
  router.delete("/distributor/:id", isAuthenticated,deleteDistributor);
  router.put("/distributor/:id", isAuthenticated,updateDistributor);
  router.get("/distributor", isAuthenticated, fetchAllDistrbutor);
  router.get("/distributorByName", isAuthenticated, orderDistrbutorsByName);
};
