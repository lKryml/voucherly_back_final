import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import { initializeOTPService } from "./routes/otpGenerator.js";
import router from "./routes/index.js";

const app = express();

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

(async () => {
  try {
    await initializeOTPService(app);
    console.log("OTP service initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize OTP service:", error);
    process.exit(1);
  }
})();
app.use("/api", router());

export default app;
