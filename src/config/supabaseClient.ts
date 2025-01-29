import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log(supabaseKey);
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be defined in the environment variables.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
