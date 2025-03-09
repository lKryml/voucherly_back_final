import express from 'express';
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
} from '../controllers/voucher.js';
import { voucherRateLimiter } from '../middleware/limitReq.js';
import { isAuthenticated } from '../middleware/index.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

//! Don't forget to use middleware
//todo testing

export default (router: express.Router) => {
  router.get('/getAllVoucher', isAuthenticated, getAllVoucher);
  router.get('/isValidVoucher/:voucher_code', apiKeyAuth, isValidVoucher); //todo add token form env
  router.get(
    '/validate-voucher/:voucherCode',
    apiKeyAuth,
    voucherRateLimiter,
    redeemVoucher,
  ); //todo add token form env
  router.delete('/deleteVoucher/:id', isAuthenticated, deleteVoucher);
  // In your routes file
  router.put('/vouchers/:id', isAuthenticated, updateVoucher);
  router.post('/createBatch', isAuthenticated, createBatch);
  router.get('/vouchers', isAuthenticated, getVouchers);
  router.get('/report-vouchers', isAuthenticated, getReportVouchers);
  router.post('/import-vouchers', isAuthenticated, importVouchers);
  router.get(
    '/reserve-voucher/:voucherCode',
    apiKeyAuth,
    voucherRateLimiter,
    reserveVoucher,
  ); //todo add token form env
  router.put(
    '/complete-voucher-redemption/:voucherCode',
    apiKeyAuth,
    completeVoucherRedemption,
  ); //todo add token form env
  router.put('/revert-voucher/:voucherCode', apiKeyAuth, revertVoucher); //todo add token form env

  return router;
};
