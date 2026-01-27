import supabase from "../config/supabaseClient.js";
import { Bulk, Distributor, Voucher } from "../typs.js";

export const getUsers = async () => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) throw error;
  return data;
};
export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  if (error) return null;
  return data;
};
export const getUserByNumber = async (phone: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone_number", phone)
    .single();
  if (error) return null;
  return data;
};
export const getUserBySessionToken = async (sessionToken: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("session_token", sessionToken)
    .single();
  if (error) return null;
  return data;
};
export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", id)
    .single();
  if (error) return null;
  return data;
};
export const deleteUserById = async (id: string) => {
  const { data, error } = await supabase
    .from("users")
    .delete()
    .eq("user_id", id);
  if (error) throw error;
  return data;
};
export const userUpdated = async (id: number, values: Record<string, any>) => {
  const { data, error } = await supabase
    .from("users")
    .update(values)
    .eq("id", id);
  if (error) {
    console.log(error);
  }
  return data;
};

export const createUser = async (user: Record<string, any>) => {
  let { data, error } = await supabase.rpc("save_new_user", user);
  if (error) {
    console.log("error in create user", error);
  } else {
    console.log("User created successfully:", data);
  }
};
//! replace the p_username to P_number in subbase
export const supabaseLogin = async (phone: string, password: string) => {
  let { data, error } = await supabase.rpc("user_login", {
    p_password: password,
    p_phone_number: phone,
  });

  if (error) {
    console.log("error in login", error);
    throw new Error("Database error during login");
  }
  
  if (!data || data.length === 0) {
    console.log("Invalid credentials for phone:", phone);
    throw new Error("Invalid phone number or password");
  }
  
  console.log("login successfully:", data);
  return data;
};
export const frogetPassword = async (passowrd: string, id: number) => {
  let { data, error } = await supabase.rpc("change_user_password", {
    p_new_password: passowrd,
    p_user_id: id,
  });

  if (error) {
    console.log("error in forget password", error);
  } else {
    console.log("new password  successfully:", data);
  }
};

export const addBulk = async (batch: Record<string, any>) => {
  const { data, error } = await supabase
    .from("batches")
    .insert([batch])
    .select("*")
    .single(); // Ensures a single object is returned

  if (error) {
    console.error("Error in creating batch:", error);
    throw error; // Propagate the error for the caller to handle
  }

  console.log("Batch created successfully:", data);
  return data; // Return the newly created batch
};

//!Bulk id
export const removeBulk = async (id: number) => {
  const { data, error } = await supabase
    .from("batches")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) {
    console.log("error in remove Bulk", error);
  } else {
    console.log("Bulk removed successfully:", data);
  }
};
export const getAllBulk = async (id: number): Promise<Bulk[]> => {
  const { data, error } = await supabase.from("batches").select("*");

  if (error) {
    console.log("error in create Bulk", error);
    return [];
  } else {
    return data;
  }
};

export const updateBulk = async (id: number, Bulk: Record<string, any>) => {
  const { data, error } = await supabase
    .from("bulk")
    .insert([Bulk])
    .eq("bulk_id", id);
  if (error) {
    console.log("error in create Bulk", error);
  } else {
    console.log(data);
  }
};
//todo : what data have to return
export const getVocuherByBulk = async (id: number) => {
  const { data, error } = await supabase
    .from("bulk")
    .select("*")
    .eq("bulk_id", id);
  if (error) {
    console.log("error in create Bulk", error);
  } else {
    return data;
  }
};

//!distributor id

export const addDistributor = async (
  distributor: Record<string, any>
): Promise<Record<string, any> | null> => {
  try {
    const { data, error } = await supabase
      .from("distributors")
      .insert([distributor])
      .select() // Select the inserted record
      .single(); // Return a single record (not an array)

    if (error) {
      console.error("Error adding distributor:", error);
      return null; // Return null if there's an error
    }

    console.log("Distributor added successfully:", data);
    return data; // Return the created distributor
  } catch (error) {
    console.error("Unexpected error adding distributor:", error);
    return null; // Return null if an unexpected error occurs
  }
};

export const removeDistributor = async (id: number) => {
  const { data, error } = await supabase
    .from("distributors")
    .update({ is_deleted: true })
    .eq("id", id)
    .select("*");
  if (error) {
    console.log("error in remove distributor", error);
  } else {
    console.log("distributor remove successfully:", data);
  }
};
export const getAllDistributor = async (
  created_by: number
): Promise<Distributor[]> => {
  console.log("tes");

  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("created_by", created_by)
    .eq("is_deleted", false);
  if (error) {
    console.log("error in getAll distributor", error);
    throw error;
  } else {
    return data;
  }
};

export const getAllDistributorsByName = async (
  created_by: number
): Promise<Distributor[]> => {
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("created_by", created_by)
    .eq("is_deleted", false)
    .order("name");
  if (error) {
    console.log("error in getAll distributor", error);
    throw error;
  } else {
    return data;
  }
};
export const getDistributor = async (id: number, bulk_id: number) => {
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("id", id)
    .eq("bulk_id", bulk_id);
  if (error) {
    console.log("error in get distributor", error);
  } else {
    console.log("distributor get successfully:", data);
  }
};
export const updateDistributorData = async (
  id: number,
  distributor: Record<string, any>
) => {
  const { data, error } = await supabase
    .from("distributors")
    .update(distributor)
    .eq("id", id);
  if (error) {
    console.log("error in update distributor", error);
  } else {
    console.log("distributor update successfully:", data);
  }
};

//voucher
export const addVoucher = async (voucher: Record<string, any>) => {
  const { data, error } = await supabase.from("voucher").insert([voucher]);
  if (error) {
    console.log("error in add voucher", error);
  } else {
    console.log("voucher add successfully:", data);
  }
};

export const removeVoucher = async (id: number) => {
  console.log(id);
  const { data, error } = await supabase
    .from("vouchers")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) {
    console.log("error in remove voucher", error);
  } else {
    console.log("voucher remove successfully:", data);
  }
};
export const getAllVoucherByBulk = async (
  voucher_bulk_id: number
): Promise<Voucher[]> => {
  const { data, error } = await supabase
    .from("vouchers")
    .select("*")
    .eq("batch_id", voucher_bulk_id);
  if (error) {
    console.log("error in getAll voucher", error);
    throw error;
  } else {
    return data;
  }
};
export const getAllVouchers = async () => {
  const { data, error } = await supabase.from("vouchers").select("*");
  // .eq("voucher_id", id); //!add id
  if (error) {
    console.log("error in get voucher", error);
  } else {
    console.log("voucher get successfully:", data);
  }
};
export const getVoucherByCode = async (voucherCode: string) => {
  const { data: vouchersData, error: vouchersError } = await supabase
    .from("vouchers")
    .select("*")
    .eq("redemption_code", voucherCode);
  if (vouchersError) {
    console.log("error in get voucher", vouchersError);
  } else {
    console.log("voucher get successfully:", vouchersData);
    return vouchersData;
  }
};
export const updateVoucherData = async (
  id: number,
  voucher: Record<string, any>
) => {
  const { data, error } = await supabase
    .from("vouchers")
    .update(voucher)
    .eq("id", id)
    .select("status");
  console.log(data);
  if (error) {
    console.log("error in update voucher", error);
  } else {
    console.log("voucher update successfully:", data);
  }
};
export const isValid = async (voucher_code: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("voucher")
    .select("*")
    .eq("voucher_code", voucher_code)
    .single();

  if (error) {
    console.log("error in get voucher", error);
    return false;
  } else {
    return data.voucher_status === 1;
  }
};
//! change created by to api and add bulk id
export const findByCode = async (voucher_code: string, created_by: number) => {
  const { data, error } = await supabase
    .from("voucher")
    .select("*")
    .eq("voucher_code", voucher_code)
    .eq("created_by", created_by);

  if (error) {
    console.log("error in get voucher", error);
  } else {
    return data;
  }
};
export const updateStatus = async (
  voucher_code: string,
  created_by: number,
  status: number
) => {
  const { data, error } = await supabase
    .from("voucher")
    .update({ voucher_status: status })
    .eq("voucher_code", voucher_code)
    .eq("created_by", created_by);

  if (error) {
    console.log("error in get voucher", error);
  } else {
    return data;
  }
};
//! aoiKey have status
export const findByKey = async (api_key: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("api_key", api_key)
    .single();

  if (error) {
    console.log("error in get voucher", error);
    return null;
  } else {
    return data;
  }
};
//template
export const getAllTemplate = async (created_by: number): Promise<any[]> => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("created_by", created_by);
  if (error) {
    console.log("error in getAll template", error);
    throw error;
  } else {
    return data;
  }
};

export const getAllTemplateByName = async (
  created_by: number
): Promise<any[]> => {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("created_by", created_by)
    .eq("is_deleted", false)
    .order("name");
  if (error) {
    console.log("error in getAll template", error);
    throw error;
  } else {
    return data;
  }
};
export const removeTemplate = async (id: number) => {
  const { data, error } = await supabase
    .from("templates")
    .update({ is_deleted: true })
    .eq("id", id);
  if (error) {
    console.log("error in remove template", error);
  } else {
    console.log("template remove successfully:", data);
  }
};

export const updateTemplateData = async (
  id: number,
  template: Record<string, any>
) => {
  const { data, error } = await supabase
    .from("templates")
    .update(template)
    .eq("id", id);
  if (error) {
    console.log("error in update template", error);
  } else {
    console.log("template update successfully:", data);
  }
};
export const addTemplate = async (template: Record<string, any>) => {
  const { data, error } = await supabase
    .from("templates")
    .insert([template])
    .select()
    .single();

  if (error) throw error;
  return data;
};
export const getTemplate = async (id: number, bulk_id: number) => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("template_id", id)
    .eq("bulk_id", bulk_id);
  if (error) {
    console.log("error in get distributor", error);
  } else {
    console.log("distributor get successfully:", data);
  }
};
export const createBatchVoucher = async (data: any) => {
  const { data: batchData, error } = await supabase.rpc(
    "create_voucher_batch ",
    data
  );

  if (error) {
    throw new Error(error.message);
  } else return batchData;
};


export const revertVoucherStatus = async (voucherCode: string) => {
  try {
    const { data, error: fetchError } = await supabase
      .from('vouchers')
      .select('status')
      .eq('redemption_code', voucherCode)
      .single();

    if (fetchError) {
      console.error("Error fetching voucher status:", fetchError);
      throw fetchError;
    }

    if (!data || data.status !== 'suspended') {
      console.log("Voucher is not in a revertible state.");
      return; 
    }


    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ status: 'valid' })
      .eq('redemption_code', voucherCode);

    if (updateError) {
      console.error("Error reverting voucher status:", updateError);
      throw updateError;
    }

  } catch (error) {
    console.error("Error in revertVoucherStatus:", error);
    throw error;
  }
};
