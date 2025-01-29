import express from "express";
import authentication from "./authentication.js";
// import companyRoutes from "./companyRoutes";

 import voucherRoutes from "./voucher.js";
 import distributor from "./distributor.js";
 import bulk from "./bulk.js";

import users from "./users.js";
import template from "./template.js";



const router = express.Router();
export default (): express.Router => {
  authentication(router);

  // companyRoutes(router);

   voucherRoutes(router);
  users(router);
  distributor(router);
   bulk(router);
   template(router);


  return router;
};