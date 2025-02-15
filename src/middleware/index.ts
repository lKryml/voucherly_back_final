import { findByKey, getUserBySessionToken } from "../db/index.js";
import express from "express";

import lodash from "lodash";
const { merge } = lodash;

export const isAuthenticated = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    console.log("hi");

    const sessionToken = req.cookies["voucherA"];
    console.log(sessionToken);

    if (!sessionToken) {
      res.status(403).json({ message: "sessionToken is expiry" });
      return;
    }

    const existingUser = await getUserBySessionToken(sessionToken);
    console.log(existingUser);

    if (!existingUser) {
      res.status(403).json({ message: "user not found" });
      return;
    }

    req = merge(req, { identity: existingUser });

    next();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// export const isOwner = async (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction
// ) => {
//   try {
//     const { id } = req.params;
//     //!check id
//     const currentUserId = get(req, "identity.id") as string;
//     if (!currentUserId) {
//       res.sendStatus(400);
//       return;
//     }
//     if (currentUserId.toString() !== id) {
//       res.sendStatus(400);
//       return;
//     }
//     next();
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
const checkAccess = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { VOUCHER_API_KEY } = req.headers;
    const apiKey = Array.isArray(VOUCHER_API_KEY)
      ? VOUCHER_API_KEY[0]
      : VOUCHER_API_KEY;
    if (!apiKey) {
      return res.status(400).send({ error: "API key is missing" });
    }
    const access = await findByKey(apiKey);
    if (!access) {
      return res.status(403).send({ error: "Access denied" });
    }
    next();
  } catch (error) {
    res.status(500).send(error);
  }
};
