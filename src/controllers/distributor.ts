import {
  getAllDistributor,
  getAllDistributorsByName,
  removeDistributor,
  updateDistributorData,
} from "./../db/index.js";
import { addDistributor } from "../db/index.js";
import express from "express";
import { Distributor } from "../typs.js";
import lodash from 'lodash';
const { get } = lodash;

export const createDistributor = async (
  req: express.Request,
  res: express.Response
): Promise<void> => {
  // Ensure the function returns `void` or `Promise<void>`
  try {
    const { name, fee, is_percentage, phone } = req.body;

    // Validate required fields
    if (!name || typeof fee === 'undefined' || fee === null) {
      res.status(403).json({ message: "Name and fee are required" });
      return; // Do not return the response object
    }

    
    const currentUserId = get(req, "identity.id");
    if (typeof currentUserId !== 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }


    // Create the distributor
    const createdDistributor = await addDistributor({
      name,
      fee,
      is_percentage,
      status: 1,
      created_by: currentUserId,
      phone,
    });

    // Check if the distributor was created successfully
    if (!createdDistributor) {
      res.status(500).json({ message: "Failed to create distributor" });
      return; // Do not return the response object
    }

    // Return the created distributor in the response
    res.status(200).json({
      message: "Distributor created successfully",
      distributor: createdDistributor,
    });
  } catch (error : any) {
    console.error("Error creating distributor:", error);
    res.status(500).json({ message: error.message });
  }
};
export const deleteDistributor = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;

    await removeDistributor(Number(id));
    res.status(200).json({ message: "distributor  deleted successfully" });
  } catch (error : any ) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchAllDistrbutor = async (
  req: express.Request,
  res: express.Response
) => {
  console.log("hello my friend");
  try {
    const currentUserId = get(req, "identity.id") 
    if (typeof currentUserId !== 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }

    const distributors: Distributor[] = await getAllDistributor(currentUserId);
    console.log(distributors);

    if (!distributors) {
      res.status(400).json({ message: "error in fetch distributors" });
      return;
    }
    res
      .status(200)
      .json({ distributors, message: "distributors fetched successfully" });
  } catch (error : any ) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDistributor = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const { name, fee, phone,currency,isPercentage } = req.body;

    if (!name && !fee && !currency &&!isPercentage) {
      res.status(400).json({ message: "Distributor data is required" });
      return;
    }
    const updateData: { [key: string]: any } = { name, fee, phone,currency,is_percentage:isPercentage };
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    console.log(updateData);

    await updateDistributorData(Number(id), updateData);
    res.status(200).json({ message: "distributor  updated successfully" });
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};
export const orderDistrbutorsByName = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const currentUserId = get(req, "identity.id")
    if (currentUserId !== 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }
    console.log(currentUserId);

    const distributors: Distributor[] = await getAllDistributorsByName(
      currentUserId
    );
    if (!distributors) {
      res.status(400).json({ message: "error in fetch distributors" });
      return;
    }
    res
      .status(200)
      .json({ distributors, message: "distributors fetched successfully" });
  } catch (error : any) {
    res.status(500).json({ message: error.message });
  }
};
