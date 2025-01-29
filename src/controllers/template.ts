import {
  getAllTemplate,
  removeTemplate,
  updateTemplateData,
  addTemplate,
  getAllTemplateByName,
} from "./../db/index.js";
import express from "express";
import lodash from 'lodash';
const { get } = lodash;

export const createTemplate = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { name, length, value, include_letters, include_numbers, distributor_id } =
      req.body;

    if (
      !length ||
      !value ||
      !distributor_id ||
      !name
    ) {
      res.status(403).json({ message: "data Template  require" });
      return;
    }
    const currentUserId = get(req, "identity.id") 
    if (typeof currentUserId != 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }
      
    //!
    console.log(currentUserId);
    
    const currentTemplate =await addTemplate({
      name,
      length,
      value,
      include_letters,
      include_numbers,
      distributor_id,
      created_by: currentUserId,
    });
    res.status(200).json({ message: "Template  created successfully",template :currentTemplate });
  } catch (error :any) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteTemplate = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    await removeTemplate(Number(id));
    res.status(200).json({ message: "Template  deleted successfully" });
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchAllTemplate = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const currentUserId = get(req, "identity.user_id") 
    if (typeof currentUserId != 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }
    console.log(currentUserId);
    const Templates: any[] = await getAllTemplate(currentUserId);
    if (!Templates) {
      res.status(400).json({ message: "error in fetch Templates" });
      return;
    }
    res
      .status(200)
      .json({ Templates, message: "Templates fetched successfully" });
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
};
export const updateTemplate = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { id } = req.params;
    const { length, value, isLetter, isNumber, distributor, name_ar } =
      req.body;

    if (
      !length &&
      !value &&
      !isLetter &&
      !isNumber &&
      !distributor &&
      !name_ar
    ) {
      res.status(400).json({ message: "Template data is required" });
      return;
    }
    const updateData: { [key: string]: any } = {
      name_ar,
      length,
      value,
      isLetter,
      isNumber,
      distributor,
    };
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    console.log(updateData);

    await updateTemplateData(Number(id), updateData);
    res.status(200).json({ message: "Template  updated successfully" });
  } catch (error :any) {
    res.status(500).json({ message: error.message });
  }
};

export const fetchAllTemplateByName = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const currentUserId = get(req, "identity.id")
    if (typeof currentUserId !== 'number') {
      res.status(403).json({ message: "Unauthorized - Invalid user identity" });
      return;
    }
    console.log(currentUserId);
    const Templates: any[] = await getAllTemplateByName(currentUserId);
    if (!Templates) {
      res.status(400).json({ message: "error in fetch Templates" });
      return;
    }
    res
      .status(200)
      .json({ Templates, message: "Templates fetched successfully" });
  } catch (error :any) {
    res.status(500).json({ message: error.message });
  }
};
