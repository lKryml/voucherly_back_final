import crypto from "crypto";
//todo remove this 
// import twilio from "twilio";
import dotenv from "dotenv";
import otpGenerator from "otp-generator";
dotenv.config();

const SECRET = "VOUCHER-AUTH-API";

export const random = () => crypto.randomBytes(128).toString("base64");

export const authentication = (salt: string, password: string) => {
  return crypto
    .createHmac("sha256", [salt, password].join("/"))
    .update(SECRET)
    .digest("hex");
};

export const getOTP = async (P_phoneNumber: string) => {
//   const client = twilio(process.env.accountSid, process.env.authToken);
//   const otp = otpGenerator.generate(6, {
//     digits: true,
//     lowerCaseAlphabets: false,
//     upperCaseAlphabets: false,
//     specialChars: false,
//   });
  try {
    // await client.messages.create({
    //   body: `🔐 Your OTP is: *${otp}*\n\nCopy the OTP and paste it into the app to verify your number.`,
    //   from: "whatsapp:+14155238886",
    //   to: `whatsapp:+${P_phoneNumber}`,
    // });
    // return otp.trim();
  } catch (error: any) {
    console.log(error.message);
  }
};
