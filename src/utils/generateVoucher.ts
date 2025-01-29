import supabase from "../config/supabaseClient.js";

const voucherString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const voucherNumber = "0123456789";

const isVoucherCodeNotExist = async (voucherCode: string) => {
  const { data, error } = await supabase
    .from("voucher")
    .select("voucher_code")
    .eq("voucher_code", voucherCode);
  if (error) {
    console.log("in voucher code exist", error);
    return false;
  }
  return !data;
};
export const generate_unique_voucher_code = async (
  lengthVoucher: number,
  num = false,
  str = false
) => {
  const characters = (num ? voucherNumber : "") + (str ? voucherString : "");
  let voucherCode = "";
  for (let i = 0; i < lengthVoucher; i++) {
    voucherCode += characters[Math.floor(Math.random() * characters.length)];
  }
  if (await isVoucherCodeNotExist(voucherCode)) {
    return voucherCode;
  }
  return null;
};
export const generate_unique_serial_number = () => {};
