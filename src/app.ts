import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import { initializeOTPService } from "./routes/otpGenerator.js";
import router from "./routes/index.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
app.set("trust proxy", 1); // Trust first proxy

app.use(express.json({ limit: "10kb" }));

app.use(helmet());

app.use(
  cors({
    origin: ["https://topup.rento.ly", "https://vouchermanagement.rento.ly"],
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests from this IP, please try again later",
  validate: { trustProxy: true },
});

(async () => {
  try {
    await initializeOTPService(app);
    console.log("OTP service initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize OTP service:", error);
    process.exit(1);
  }
})();
app.use("/api/auth", authLimiter);

app.use("/api", router());

export default app;
