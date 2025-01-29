import { get } from "lodash";
import { addBulk, getAllBulk, getVocuherByBulk, removeBulk } from "../db/index.js";
import express from "express";
import { Bulk } from "../typs.js";


import supabase from "../config/supabaseClient.js";

// Define types for Batch and Voucher
interface Voucher {
  serialNumber: string;
  redemptionCode: string;
  status: string;
  value: number;
  currency: string;
  distributorId: number;
  templateId?: number | null;
  expiryDate: string;
}

interface Batch {
  serialNumber: string;
  status: string;
  totalValue: number;
  voucherCount: number;
  currency: string;
  distributorId: number;
  templateId?: number | null;
  expiryDate: string;
  vouchers: Voucher[];
}

// Controller function to insert batch and vouchers
export const insertBatchAndVouchers = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { newBatch }: { newBatch: Batch } = req.body; // Extract newBatch from request body

    // Validation: check if all necessary fields are present
    if (!newBatch || !newBatch.serialNumber || !newBatch.voucherCount || !newBatch.distributorId || !newBatch.expiryDate) {
      res.status(400).json({ message: "Missing required fields for batch and vouchers." });
      return;
    }

    // Insert batch into the "batches" table
    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .insert([
        {
          serial_number: newBatch.serialNumber,
          status: newBatch.status,
          total_value: newBatch.totalValue,
          voucher_count: newBatch.voucherCount,
          currency: newBatch.currency,
          distributor_id: newBatch.distributorId,
          template_id: newBatch.templateId || null,
          expiry_date: newBatch.expiryDate,
        },
      ])
      .select()
      .single();

    if (batchError) {
      res.status(500).json({ message: "Error inserting batch", error: batchError.message });
      return;
    }

    // Insert vouchers into the "vouchers" table
    const { error: vouchersError } = await supabase.from("vouchers").insert(
      newBatch.vouchers.map((v) => ({
        serial_number: v.serialNumber,
        redemption_code: v.redemptionCode,
        status: v.status,
        value: v.value,
        currency: v.currency,
        distributor_id: v.distributorId,
        template_id: v.templateId || null,
        batch_id: batchData.id,
        expiry_date: v.expiryDate,
      }))
    );

    if (vouchersError) {
      res.status(500).json({ message: "Error inserting vouchers", error: vouchersError.message });
      return;
    }

    // Return the inserted batch data as the response
    res.status(200).json({
      message: "Batch and vouchers inserted successfully",
      batch: batchData,
    });
  } catch (error : any) {
    console.error("Error inserting batch and vouchers:", error);
    res.status(500).json({ message: "Failed to insert batch and vouchers", error: error.message });
  }
};

export const createBulk = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { voucher_count, bulk_value, distributor_id, created_at, expiry_date } = req.body;


    if (!bulk_value || !voucher_count || !distributor_id || !created_at || !expiry_date) {
      res.status(400).json({ message: "All bulk data fields are required" });
      return;
    }


    const currentUserId = get(req, "identity.id");

      // Add validation for the user ID
      if (typeof currentUserId !== 'number') {
        res.status(403).json({ message: "Unauthorized - Invalid user identity" });
        return;
      }


    const voucherByBulk: any = await addBulk({
      created_by: currentUserId,
      voucher_count,
      created_at,
      expiry_date,
      total_value: bulk_value, 
      distributor_id,
    });


    res.status(200).json({
      message: "Bulk created successfully",
      voucher: voucherByBulk,
    });
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchAllBulk = async (
  req: express.Request,
  res: express.Response
) => {
  try {
   const currentUserId = get(req, "identity.id");

// Add validation for the user ID
if (typeof currentUserId !== 'number') {
  res.status(403).json({ message: "Unauthorized - Invalid user identity" });
  return;
}
    console.log(currentUserId);
    const bulks: Bulk[] = await getAllBulk(currentUserId);
    if (!bulks) {
      res.status(400).json({ message: "error in fetch distributors" });
      return;
    }
    res.status(200).json({ bulks, message: "fetch all Bulk successfully" });
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBulk = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    await removeBulk(Number(id));
    res.status(200).json({ message: "bulk  deleted successfully" });
  } catch (error : any ) {
    res.status(500).json({ message: error.message });
  }
};
