import { Request,Response } from "express";
import client from "@repo/db/client";

export const getAvatars = async (req: Request, res: Response) => {
  try {
    const avatars = await client.avatar.findMany();
    res.json({avatars: avatars.map(x => ({
        id: x.id,
        imageUrl: x.imageUrl,
        name: x.name
    }))});
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve avatars" });
  }
};
