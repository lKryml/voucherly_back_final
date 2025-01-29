// import express, { Request, Response } from 'express';
// import { Voucher } from '../models/voucher'; // Assuming you have a Voucher model

// const router = express.Router();

// // Create a new voucher
// router.post('/voucher', async (req: Request, res: Response) => {
//     try {
//         const { code, discount } = req.body;
//         const voucher = new Voucher({ code, discount });
//         await voucher.save();
//         res.status(201).send(voucher);
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Get a voucher by code
// router.get('/voucher/:code', async (req: Request, res: Response) => {
//     try {
//         const voucher = await Voucher.findOne({ code: req.params.code });
//         if (!voucher) {
//             return res.status(404).send();
//         }
//         res.send(voucher);
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });

// // Update a voucher by code
// router.patch('/voucher/:code', async (req: Request, res: Response) => {
//     try {
//         //
//         const updates = Object.keys(req.body);
//         const allowedUpdates = ['code', 'discount'];
//         const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

//         if (!isValidOperation) {
//             return res.status(400).send({ error: 'Invalid updates!' });
//         }

//         const voucher = await Voucher.findOne({ code: req.params.code });

//         if (!voucher) {
//             return res.status(404).send();
//         }

//         updates.forEach((update) => (voucher[update] = req.body[update]));
//         await voucher.save();
//         res.send(voucher);
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Delete a voucher by code
// router.delete('/voucher/:code', async (req: Request, res: Response) => {
//     try {
//         const voucher = await Voucher.findOneAndDelete({ code: req.params.code });

//         if (!voucher) {
//             return res.status(404).send();
//         }

//         res.send(voucher);
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });
// // Generate a new voucher code
// router.post('/voucher/generate', async (req: Request, res: Response) => {
//     try {
//         const { discount } = req.body;
//         const code = Math.random().toString(36).substring(2, 15);
//         const voucher = new Voucher({ code, discount });
//         await voucher.save();
//         res.status(201).send(voucher);
//     } catch (error) {
//         res.status(400).send(error);
//     }
// });

// // Redeem a voucher
// router.post('/voucher/redeem', async (req: Request, res: Response) => {
//     try {
//         const { code } = req.body;
//         const voucher = await Voucher.findOne({ code });

//         if (!voucher) {
//             return res.status(404).send({ error: 'Voucher not found' });
//         }

//         // Assuming you have a User model and a wallet field
//         const user = req.user; // Assuming user is authenticated and available in req.user
//         user.wallet += voucher.discount;
//         await user.save();

//         // Optionally, you can delete the voucher after redemption
//         await Voucher.deleteOne({ code });

//         res.send({ message: 'Voucher redeemed successfully', discount: voucher.discount });
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });
// // Middleware to check if the website has access to the endpoint
// const checkWebsiteAccess = async (req: Request, res: Response, next: Function) => {
//     try {
//         const { websiteKey } = req.headers;
//         // Assuming you have a Website model to verify access
//         const website = await Website.findOne({ key: websiteKey });

//         if (!website) {
//             return res.status(403).send({ error: 'Access denied' });
//         }

//         next();
//     } catch (error) {
//         res.status(500).send(error);
//     }
// };

// // Apply the middleware to the redeem endpoint
// router.post('/voucher/redeem', checkWebsiteAccess, async (req: Request, res: Response) => {
//     try {
//         const { code } = req.body;
//         const voucher = await Voucher.findOne({ code });

//         if (!voucher) {
//             return res.status(404).send({ error: 'Voucher not found' });
//         }

//         // Assuming you have a User model and a wallet field
//         const user = req.user; // Assuming user is authenticated and available in req.user
//         user.wallet += voucher.discount;
//         await user.save();

//         // Optionally, you can delete the voucher after redemption
//         await Voucher.deleteOne({ code });

//         res.send({ message: 'Voucher redeemed successfully', discount: voucher.discount });
//     } catch (error) {
//         res.status(500).send(error);
//     }
// });
// export default router;
