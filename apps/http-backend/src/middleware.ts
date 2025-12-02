import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "@repo/backend-common/index";

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function middleware(req: Request, res: Response, next: NextFunction){
    const token = req.headers["authorization"] ?? "";

    const decode = jwt.verify(token, JWT_SECRET)
    console.log("Decode", decode)
    if (decode){
      // @ts-ignore
        req.userId = decode.userId;
        next();
    }
    else {
        res.status(403).json({
            message: "Unauthorized"
        })
    }
}