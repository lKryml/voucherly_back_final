import express from "express";
import {
  getUserByNumber,
  supabaseLogin,
  createUser,
  frogetPassword,
  userUpdated,
} from "../db/index.js";
import { authentication, random, getOTP } from "../helper/index.js";
import { findByKey, getUserBySessionToken } from "../db/index.js";
import { log } from "console";
const otpUsers: string[] = [];
// export const register = async (req: express.Request, res: express.Response) => {
//   try {
//     const { email, password, username } = req.body;
//     if (!email || !password || !username) {
//       res.send(400).json({ message: "user data require " });
//       return;
//     }
//     const existingUser = await getUserByEmail(email);
//     if (existingUser) {
//       res.send(400).json({ message: "user is already exist" });
//       return;
//     }
//     const salt = random();
//     const user = await createUser({
//       email,
//       username,
//       authentication: {
//         salt,
//         password: authentication(salt, password),
//       },
//     });
//     res.status(200).json(user).end();
//   } catch (error) {
//     res.send(500).json({ message: error.message });
//   }
// };
export const generateAndSaveSessionToken = async (
  userId: any,
  res: express.Response
): Promise<string> => {
  const salt = random();
  const session_token = authentication(salt, userId) as string;
  console.log("Generated session token:", session_token);

  // Set the session token as a cookie
  res.cookie("VOUCHER-AUTH", session_token, {
    domain: ".rento.ly", // Change if needed
    path: "/",
    httpOnly: true, // Recommended for security
    secure: true, // Set to true if using HTTPS
    sameSite: "lax", // Allows cross-site requests while preventing CSRF
    maxAge: 60 * 60 * 24 * 1000, // 1 day
  });

  console.log("Cookie set successfully.");

  // Update the user's session token in the database
  await userUpdated(Number(userId), { session_token });

  return session_token;
};

export const verifySessionToken = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      res.status(400).json({ message: "Session token is required" });
      return;
    }

    const user = await getUserBySessionToken(session_token);

    if (!user) {
      res.status(401).json({ message: "Invalid session token" });
      return;
    }

    res.status(200).json({ message: "Session token is valid", user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const register = async (req: express.Request, res: express.Response) => {
  try {
    const {
      application_name_ar,
      application_name_en,
      company_name_ar,
      company_name_en,
      created_by,
      currency,
      email,
      full_name_ar,
      full_name_en,
      mobile_no,
      password,
      user_role,
      user_status,
      username,
    } = req.body;
    if (
      !application_name_ar ||
      !application_name_en ||
      !company_name_ar ||
      !company_name_en ||
      !created_by ||
      !currency ||
      !email ||
      !full_name_ar ||
      !full_name_en ||
      !mobile_no ||
      !password ||
      !user_role ||
      !user_status ||
      !username
    ) {
      res.status(403).json({ message: "data require" });
      return;
    }
    const user = await createUser({
      p_application_name_ar: application_name_ar,
      p_application_name_en: application_name_en,
      p_company_name_ar: company_name_ar,
      p_company_name_en: company_name_en,
      p_created_by: created_by,
      p_currency: currency,
      p_email: email,
      p_full_name_ar: full_name_ar,
      p_full_name_en: full_name_en,
      p_mobile_no: mobile_no,
      p_password: password,
      p_user_role: user_role,
      p_user_status: user_status,
      p_username: username,
    });
    res.status(200).json(user);
    return;
  } catch (error: any) {
    res.send(500).json({ message: error.message });
    return;
  }
};

export const login = async (req: express.Request, res: express.Response) => {
  try {
    const { P_phoneNumber, p_password } = req.body;

    if (!P_phoneNumber || !p_password) {
      res.status(400).json({
        message: `${p_password ? "password " : ""} ${
          p_password && P_phoneNumber ? "& " : ""
        }${P_phoneNumber ? "username" : ""}  require`,
      });
      return;
    }

    await supabaseLogin(P_phoneNumber, p_password);
    const user: any = await getUserByNumber(P_phoneNumber);
    console.log(user);

    if (!user) {
      res.status(400).json({
        message: "user not found",
      });
      return;
    }

    otpUsers[P_phoneNumber] = (await getOTP(P_phoneNumber)) || "";
    const salt = random();

    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changePasswword = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { P_phoneNumber, newPassword } = req.body;
    const user = await getUserByNumber(P_phoneNumber);
    await frogetPassword(newPassword, user.user_id);

    res.status(200).json(user);
    return;
  } catch (error: any) {
    res.status(500).json({ message: error.message });
    return;
  }
};

//todo OTP
export const sendOTP = async (req: express.Request, res: express.Response) => {
  try {
    const { otp, P_phoneNumber } = req.body;
    if (otp.trim() !== otpUsers[P_phoneNumber]) {
      res.status(400).json({ message: "Invalid OTP" });
      return;
    }
    res.status(200).json({ message: "OTP verified successfully" });
    return;
  } catch (error: any) {
    res.status(500).json({ message: error.message });
    return;
  }
};

//   // Ensure otpUsers has an index signature allowing string values
// const otpUsers: { [key: string]: string } = {};

// Your existing assignment line with TypeScript compatibility
// otpUsers[P_phoneNumber] = (await getOTP(P_phoneNumber)) || "";
//     const salt = random();
//     const session_token = authentication(salt, user.id) as string;
//     res.cookie("VOUCHER-AUTH", session_token, {
//       domain: "localhost",
//       path: "/",
//       httpOnly: true,

//       maxAge: 60 * 60 * 24 * 1000,
//     });
//     console.log(session_token);
//     // log(user);
//     await userUpdated(Number(user.id), { session_token });

//     res.status(200).json({ user, session_token });
//   } catch (error : any) {
//     res.status(500).json({ message: error.message });
//   }
// };
