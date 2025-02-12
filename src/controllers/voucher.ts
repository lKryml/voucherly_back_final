import exp from "constants";
import {
  addVoucher,
  createBatchVoucher,
  findByCode,
  getAllBulk,
  getAllVoucherByBulk,
  getDistributor,
  getTemplate,
  getVoucherByCode,
  isValid,
  removeVoucher,
  updateStatus,
  updateVoucherData,
} from "../db/index.js";
import express from "express";
import lodash from "lodash";
const { get } = lodash;
import { Bulk, Voucher } from "../typs.js";
import supabase from "../config/supabaseClient";
import { Request, Response, NextFunction } from 'express';
// export const createVouchers = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   const { id } = req.params;
//   try {
//     const { value } = req.body;
//     if (!value) {
//       res.status(403).json({ message: "data voucher require" });
//       return;
//     }
//     const currentUserId = get(req, "identity.user_id") as number;
//     //todo :  add in craete bulk
//     //await addVoucher(currentUserId , id , vlaue , length , number );
//     res.status(200).json({ message: "vouchers created successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const importVouchers = async (req: Request, res: Response) => {
  try {
    const { batches } = req.body; // Expecting an array of batches from frontend

    for (const batch of batches) {
      // Fetch distributor_id
      const { data: distributorData, error: distributorError } = await supabase
        .from("distributors")
        .select("id")
        .eq("name", batch.distributorName)
        .single();

      if (distributorError) throw distributorError;
      if (!distributorData) throw new Error("Distributor not found");

      const distributorId = distributorData.id;

      // Insert batch
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .insert([
          {
            serial_number: batch.serialNumber,
            status: batch.status,
            total_value: batch.totalValue,
            voucher_count: batch.voucherCount,
            currency: batch.currency,
            distributor_id: distributorId,
            expiry_date: batch.expiryDate,
          },
        ])
        .select()
        .single();

      if (batchError) throw batchError;

      // Insert vouchers
      const { error: vouchersError } = await supabase.from("vouchers").insert(
        batch.vouchers.map((v:any) => ({
          serial_number: v.serialNumber,
          redemption_code: v.redemptionCode,
          status: v.status,
          value: v.value,
          currency: v.currency,
          distributor_id: distributorId,
          batch_id: batchData.id,
          expiry_date: v.expiryDate,
        }))
      );

      if (vouchersError) throw vouchersError;
    }

    res.status(200).json({ message: "Batches and vouchers imported successfully" });
  } catch (error) {
    console.error("Error importing batches:", error);
    res.status(500).json({ message: "Failed to import vouchers", error: error.message });
  }
};
export const isValidVoucher = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { voucher_code } = req.params;

    if (!voucher_code) {
      res.status(400).json({ message: "Voucher code is required" });
      return;
    }

    const validationVoucher: boolean = (await isValid(voucher_code)) || false;
    if (!validationVoucher) {
      res.status(400).json({ message: "Voucher is not active" });
      return;
    }
    res.status(200).json({ message: "Voucher is valid" });
  } catch (error : any ) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteVoucher = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    await removeVoucher(Number(id));
    res.status(200).json({ message: "voucher deleted successfully" });
  } catch (error :any) {
    res.status(500).json({ message: error.message });
  }
};

//! not now
export const updateVoucher1 = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const {} = req.body;
    await updateVoucherData(Number(id), null);
    res.status(200).json({ message: "voucher updated successfully" });
  } catch (error :any) {
    res.status(500).json({ message: error.message });
  }
};
export const redeemVoucher = async (
  req: express.Request,
  res: express.Response
) => {
  const { voucherCode } = req.params;

  if (!voucherCode || !/^[a-zA-Z0-9]{6,20}$/.test(voucherCode)) {
    res.status(400).json({
      message:
        "Invalid voucher code format. Voucher code must be alphanumeric and 12–20 characters long.",
    });
    return;
  }

  try {
    const voucherResult = await getVoucherByCode(voucherCode);
    const voucher: any | null = voucherResult ? voucherResult[0] : null;
    if (voucher === null) {
      res.status(404).json({ message: "Voucher not found." });
      return;
    }

    if (voucher.status == "suspended") {
      res.status(400).json({
        message: `Voucher is suspended please contact +218 93‑1316064 with screenshot and serial number`,
      });
      return;
    }
    if (voucher.status !== "valid") {
      res
        .status(400)
        .json({ message: `Voucher has already been ${voucher.status}` });
      return;
    }

    if (new Date(voucher.expiry_date) < new Date()) {
      res.status(400).json({ message: "Voucher has expired." });
      return;
    }
    await updateVoucherData(voucher.id, { status: "redeemed" });

    res.status(200).json({
      message: "Voucher is valid.",
      voucher: {
        code: voucher.redemption_code,
        amount: voucher.value,
        currency: voucher.currency,
        expiryDate: voucher.expiry_date,
      },
    });
  } catch (error) {
    console.error("Error validating voucher:", error);
    res
      .status(500)
      .json({ message: "An error occurred while validating the voucher." });
  }
};
//!tempalate
export const getAllVoucher = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const currentUserId = get(req, "identity.user_id") 
    if (typeof currentUserId !== 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }
    const bulks: Bulk[] = await getAllBulk(currentUserId);

    const allVouchers = await Promise.all(
      bulks.map(async (bulk) => {
        if(!bulk.id) return;
        const voucherByBulk = await getAllVoucherByBulk(bulk.id);
        const distributorName = await getDistributor(
          currentUserId,
          bulk.id
        ).then((res: any) => res.name_ar);
        const templateName = await getTemplate(currentUserId, bulk.id).then(
          (res: any) => res.name_ar
        );
        return {
          totalBalance: bulk.bulk_balance,
          totalValue: bulk.bulk_value,
          templateName,
          distributorName,
          ...voucherByBulk,
        };
      })
    );
    res.status(200).send(allVouchers);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const createBatch = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const {
      length,
      value,
      expiryDate,
      count,
      currency,
      distributorId,
      includeNumbers,
      templateId,
      includeLetters,
    } = req.body.params;
    console.log(req.body);

    if (
      !length ||
      !value ||
      !expiryDate ||
      !count ||
      !currency ||
      !distributorId ||
      includeNumbers === undefined ||
      includeLetters === undefined
    ) {
      console.log(
        length,
        value,
        expiryDate,
        count,
        currency,
        distributorId,
        includeNumbers,
        templateId,
        includeLetters
      );

      res.status(403).send("batch data required");
      return;
    }
    console.log();

    const data = await createBatchVoucher({
      code_length: length,
      value: value,
      expiry_date: expiryDate,
      count: count,
      currency: currency,
      distributor_id: distributorId,
      template_id: templateId || undefined,
      include_numbers: includeNumbers,
      include_letters: includeLetters,
      created_by: 456,
      serial_prefix: "ADEX",
    });
    res.status(200).send(data);
  } catch (error : any) {
    res.status(400).send(error.message);
  }
};

// app/api/vouchers/route.ts
export const getVouchers = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    const fetchAllVouchers = async () => {
      let allVouchers: any[] = [];
      let from = 0;
      const chunkSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('vouchers')
          .select('*, batches!inner(is_deleted)')
          .eq('is_deleted', false)
          .eq('batches.is_deleted', false)
          .range(from, from + chunkSize - 1);

        if (error) throw error;

        allVouchers = allVouchers.concat(chunk);
        hasMore = chunk.length === chunkSize;
        from += chunkSize;
      }

      return allVouchers;
    };

    const vouchers = await fetchAllVouchers();

    res.status(200).json({
      message: "Vouchers fetched successfully",
      vouchers: vouchers.map(v => ({
        id: v.id,
        serial_number: v.serial_number,
        redemption_code: v.redemption_code,
        status: v.status,
        value: v.value,
        currency: v.currency,
        distributor_id: v.distributor_id,
        template_id: v.template_id,
        batch_id: v.batch_id,
        expiry_date: v.expiry_date
      }))
    });

  } catch (error) {
    next(error);
  }
};

interface VoucherUpdate {
  status?: string;
  value?: number;
  currency?: string;
  expiryDate?: string;
}

export const updateVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { updates, reason } = req.body as {
      updates: VoucherUpdate;
      reason: string;
    };

    // Validate input
    if (!id || !updates || !reason) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Set audit reason
    const { error: rpcError } = await supabase.rpc('set_voucher_change_reason', {
      reason: reason
    });
    if (rpcError) throw rpcError;

    // Prepare updates
    const dbUpdates = {
      status: updates.status,
      value: updates.value,
      currency: updates.currency,
      expiry_date: updates.expiryDate,
      updated_at: new Date().toISOString()
    };

    // Update voucher
    const { data: voucher, error: updateError } = await supabase
      .from('vouchers')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    // Update batch status if needed
    if (updates.status) {
      const { data: batchVouchers, error: batchError } = await supabase
        .from('vouchers')
        .select('status,batch_id')
        .eq('batch_id', voucher.batch_id);
      if (batchError) throw batchError;

      if (batchVouchers.every(v => v.status === updates.status)) {
        await supabase
          .from('batches')
          .update({ status: updates.status })
          .eq('id', voucher.batch_id);
      }
    }

    res.status(200).json({
      message: 'Voucher updated',
      voucher: {
        id: voucher.id,
        status: voucher.status,
        value: voucher.value,
        currency: voucher.currency,
        expiryDate: voucher.expiry_date,
        batchId: voucher.batch_id
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getReportVouchers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, distributorId } = req.query;

    // Validate input parameters
    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Start and end dates are required' });
      return;
    }

    // Fetch data in chunks
    const fetchAllVouchers = async () => {
      let allVouchers: any[] = [];
      let from = 0;
      const chunkSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('vouchers')
          .select('*, batches!inner(is_deleted)')
          .eq('batches.is_deleted', false)
          .eq('is_deleted', false)
          .gte('created_at', new Date(startDate as string).toISOString())
          .lte('created_at', new Date(endDate as string).toISOString())
          .range(from, from + chunkSize - 1);

        if (distributorId && distributorId !== 'all') {
          query = query.eq('distributor_id', distributorId);
        }

        const { data: chunk, error } = await query;

        if (error) throw error;

        allVouchers = [...allVouchers, ...chunk];
        hasMore = chunk.length === chunkSize;
        from += chunkSize;
      }

      return allVouchers;
    };

    const vouchers = await fetchAllVouchers();

    res.status(200).json({
      message: "Vouchers fetched successfully",
      vouchers: vouchers.map(v => ({
        id: v.id,
        status: v.status,
        value: v.value,
        created_at: v.created_at,
        updated_at: v.updated_at,
        distributor_id: v.distributor_id,
        template_id: v.template_id,
        batch_id: v.batch_id,
        expiry_date: v.expiry_date,
        redemption_code: v.redemption_code,
        serial_number: v.serial_number
      }))
    });

  } catch (error) {
    next(error);
  }
};