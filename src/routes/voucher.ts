import express from "express";
import {
  getAllVoucher,
  isValidVoucher,
  deleteVoucher,
  updateVoucher,
  redeemVoucher,
  createBatch,
  getVouchers,
  getReportVouchers,
  importVouchers,
  reserveVoucher,
  completeVoucherRedemption,
  revertVoucher,
} from "../controllers/voucher.js";
import { voucherRateLimiter } from "../middleware/limitReq.js";

//! Don't forget to use middleware
//todo testing

export default (router: express.Router) => {
  router.get("/getAllVoucher", getAllVoucher);
  router.get("/isValidVoucher/:voucher_code", isValidVoucher);
  router.get(
    "/validate-voucher/:voucherCode",
    voucherRateLimiter,
    redeemVoucher
  );
  router.delete("/deleteVoucher/:id", deleteVoucher);
  // In your routes file
  router.put('/vouchers/:id', updateVoucher);
  router.post("/createBatch",createBatch);
  router.get('/vouchers', getVouchers);
  router.get('/report-vouchers', getReportVouchers);
  router.post("/import-vouchers", importVouchers);
  router.get("/reserve-voucher/:voucherCode", voucherRateLimiter, reserveVoucher);
  router.put("/complete-voucher-redemption/:voucherCode", completeVoucherRedemption);
  router.put("/revert-voucher/:voucherCode", revertVoucher);


  return router;
};
