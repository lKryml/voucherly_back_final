import express from "express";

import supabase from "../config/supabaseClient.js";
import { addMonths, formatISO } from "date-fns";
//todo : expiry date
export const createCompany = async (
  req: express.Request,
  res: express.Response
) => {
  const { data, subscriptionDuration } = req.body;
  try {
    const currentDate = new Date();
    const expiryDate = addMonths(currentDate, subscriptionDuration);

    const companyInfo = {
      created_date: formatISO(currentDate),
      expiry_date: formatISO(expiryDate),
      status: 1,
      ...data,
    };
    const { error } = await supabase.from("company").insert([companyInfo]);
    if (error) throw error;
    res.status(201).json({ message: "company created successfully" });
  } catch (error :any) {
    res
      .status(500)
      .json({ error: "Failed to create company", details: error.message });
  }
};
export const updateCompany = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  const { newCompanyData } = req.body;

  try {
    const { data: company, error: findError } = await supabase
      .from("company")
      .select("*")
      .eq("company_id", id);

    if (findError) throw findError;

    if (!company || company.length === 0) {
      res.status(404).json({ message: `Company id : ${id} not found` });
      return;
    }
    const { data: updateData, error: updateError } = await supabase
      .from("company")
      .update(newCompanyData)
      .eq("company_id", id);

    if (updateError) throw updateError;

    res
      .status(201)
      .json({ message: `Company id : ${id} updated successfully` });
  } catch (error : any) {
    res
      .status(500)
      .json({ error: "Failed to update company", details: error.message });
  }
};
export const deleteCompany = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;

  try {
    const { error, count } = await supabase
      .from("company")
      .delete()
      .eq("company_id", id)
      .select("*");
    if (error) throw error;

    if (!count) {
      res.status(403).json({ message: `Company id : ${id} not found` });
      return;
    }

    res
      .status(200)
      .json({ message: `Company id : ${id} deleted successfully ` });
  } catch (error : any) {
    res
      .status(500)
      .json({ error: "Failed to delete company", details: error.message });
  }
};

export const updateSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  const { subscriptionDuration } = req.body;
  console.log("test");
  try {
    const { data: company, error: findError } = await supabase
      .from("company")
      .select("*")
      .eq("company_id", id);

    if (findError) throw findError;

    if (!company || company.length === 0) {
      res.status(404).json({ message: `Company id : ${id} not found` });
      return;
    }
    const newExpiryDate = formatISO(
      addMonths(new Date(), subscriptionDuration)
    );

    const { error } = await supabase
      .from("company")
      .update({ expiry_date: newExpiryDate })
      .eq("company_id", id);
    console.log(error);

    if (error) throw error;
    res.status(200).json({
      message: "Subscription updated successfully",
      company_id: id,
      new_expiry_date: newExpiryDate,
    });
  } catch (error : any) {
    res.status(500).json({
      error: "Failed to subscription company",
      details: error.message,
    });
  }
};
