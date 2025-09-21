import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;
const supabaseUrl=process.env.SUPABASE_URL
const supabaseKey=process.env.SUPABASE_KEY

console.log(supabaseKey);
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be defined in the environment variables.");
}
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
// middleware/auth.js
// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );

// export const authenticate = async (req, res, next) => {
//   const token = req.cookies['VOUCHER-AUTH'];
  
//   try {
//     const { data: { user }, error } = await supabase.auth.getUser(token);
    
//     if (error || !user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     res.status(500).json({ message: "Authentication error" });
//   }
// };