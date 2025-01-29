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
import { get } from "lodash";
import { Bulk, Voucher } from "../typs.js";

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
export const updateVoucher = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const {} = req.body;
    await updateVoucherData(Number(id), {});
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
