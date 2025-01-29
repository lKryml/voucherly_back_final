import express from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        role: string;
      };
    }
  }
}
export const roleMiddleware = (allowedRoles: string[]) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!req.user) {
      res.status(403).json({ error: "Unauthorized : User not authenticated " });
      return
    }

    if (!req.user.role) {
      res.status(403).json({ error: "Unauthorized : User role not found" });
      return

    }
    
    const role = req.user.role;
    if (!allowedRoles.includes(role)) {
      res.status(403).json({ error: "Unauthorized: Insufficient Permissions" });
      return

    }

    next();
  };
};
