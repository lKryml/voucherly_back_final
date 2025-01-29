import express from "express";
import {
  login,
  register,
  changePasswword,
  sendOTP,verifySessionToken
} from "../controllers/authentication.js";
import { isAuthenticated } from "../middleware/index.js";

//! dont forget use middlewear

export default (router: express.Router) => {
  router.post("/auth/login", login);
  router.post("/auth/send_otp", isAuthenticated, sendOTP);
  router.post("/auth/register", register);
  router.post("/auth/forgetPassword", changePasswword);
  router.post("/auth/verifyToken",verifySessionToken);
};
