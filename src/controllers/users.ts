import { getUsers } from "../db/index.js";
import express from "express";

export const getAllUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const users = await getUsers();
    res.status(200).json(users);
  } catch (error : any ) {
    res.status(500).json({ message: error.message });
  }
};
