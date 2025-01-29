import rateLimit from "express-rate-limit";
export const voucherRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "Too many requests from this IP, please try again later.",
});
