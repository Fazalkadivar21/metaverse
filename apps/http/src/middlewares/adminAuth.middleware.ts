import jwt, {JwtPayload} from "jsonwebtoken";
import client from "@repo/db/client";
import { Request,Response, NextFunction } from "express";

interface Token extends JwtPayload {
    userId: string,
    role: string
}

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Token;
    if(!decoded) {
      res.status(403).json({ message: "Invalid token" });
      return;
    }
    const user = await client.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if(user.role !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};
