import { isAuthenticated } from "../middleware/index.js";

import express from "express";
import {
  createTemplate,
  deleteTemplate,
  fetchAllTemplate,
  updateTemplate,fetchAllTemplateByName,
} from "../controllers/template.js";

export default (router: express.Router) => {
  router.post("/template", isAuthenticated, createTemplate);
  router.delete("/template/:id", isAuthenticated,deleteTemplate);
  router.put("/template/:id", isAuthenticated,updateTemplate);
  router.get("/template", isAuthenticated, fetchAllTemplate);
  router.get("/allTemplateByName", isAuthenticated, fetchAllTemplateByName);
};
