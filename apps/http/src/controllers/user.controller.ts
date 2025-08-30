import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import client from "@repo/db/client";
import { SignupSchema, SigninSchema, UpdateMetadataSchema } from "../types";
import { Request, Response } from "express";

export const register = async (req: Request, res: Response) => {
  try {
    const parser = SignupSchema.safeParse(req.body);
    if (!parser.success) {
      res.status(403).json({ message: "Invalid data" });
      return;
    }
    const hashedPassword = await bcrypt.hash(parser.data.password, 10);

    const user = await client.user.create({
      data: {
        username: parser.data.username,
        password: hashedPassword,
        role: parser.data.type === "admin" ? "Admin" : "User",
      },
    });


    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });
    
    return res
    .status(200)
    .cookie("token", token, { httpOnly: true, secure: true })
    .json({ token: token, message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: "User already exists" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parser = SigninSchema.safeParse(req.body);
    if (!parser.success) {
      res.status(403).json({ message: "Invalid data" });
      return;
    }
    
    const user = await client.user.findUnique({
      where: { username: parser.data.username },
    });
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    const validPassword = await bcrypt.compare(
      parser.data.password,
      user.password
    );
    if (!validPassword) {
      res.status(403).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return res
      .status(200)
      .cookie("token", token, { httpOnly: true, secure: true })
      .json({ token: token, message: "User logged in successfully" });
  } catch (error) {
    res.status(400).json({ error: "An error occurred while logging in" });
  }
};

export const logout = async (req: Request, res: Response) => {
  res
    .status(200)
    .clearCookie("token")
    .json({ message: "User logged out successfully" });
};

export const updateMetadata = async (req: Request, res: Response) => {
  const parser = UpdateMetadataSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(403).json({ message: "Invalid data" });
    return;
  }
  if (!req.user.userId) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }
  try {
    await client.user.update({
      where: { id: req.user.userId },
      data: {
        avatarId: parser.data.avatarId,
      },
    });

    res.json({ message: "Metadata updated successfully" });
  } catch (error) {
    res.status(400).json({ message: "Failed to update metadata" });
  }
};

export const getBulkMeta = async (req: Request, res: Response) => {
  try {
    const userIdString = (req.query.ids ?? "[]") as string;
    const userIds = userIdString.slice(1, userIdString?.length - 1).split(",");

    const metadata = await client.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        avatar: true,
        id: true,
      },
    });
    res.json({
        avatars: metadata.map(m => ({
            userId: m.id,
            avatarId: m.avatar?.imageUrl
        }))
    })
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve user metadata" });
  }
};
