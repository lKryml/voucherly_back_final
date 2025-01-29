import express from "express";
import { isBefore } from "date-fns";
import supabase from "../config/supabaseClient.js";
export const isSubscription = () => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const { id } = req.params;
    try {
      const { data: company, error } = await supabase
        .from("company")
        .select("expiry_date")
        .eq("company_id", id)
        .single();
      if (error) throw error;
      const currentDate = new Date();
      if (isBefore(new Date(company.expiry_date), currentDate)) {
        next();
      }

      res.status(403).json({ error: "Subscription has expired." });
    } catch (error : any) {
      res.status(500).json({
        error: "Failed to check subscription status",
        details: error.message,
      });
    }
  };
};
