import {
  CreateElementSchema,
  CreateAvatarSchema,
  UpdateElementSchema,
  CreateMapSchema,
} from "../types/index";
import client from "@repo/db/client";
import { Request, Response } from "express";

export const createElement = async (req: Request, res: Response) => {
  const parser = CreateElementSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(400).json({ message: "Validation failed" });
  } else {
    const element = await client.element.create({
      data: {
        imageUrl: parser.data.imageUrl,
        width: parser.data.width,
        height: parser.data.height,
        static: parser.data.static,
      },
    });

    if (!element) {
      res.status(500).json("Error creating element");
      return;
    }

    res.status(200).json({
      id: element.id,
    });
  }
};

export const updateElement = async (req: Request, res: Response) => {
  const parser = UpdateElementSchema.safeParse(req.body);
  const { elementId } = req.params;

  if (!parser.success || !elementId) {
    res.status(400).json({ message: "Validation failed, provide valid data" });
    return;
  } else {
    const element = await client.element.findFirst({
      where: {
        id: elementId,
      },
    });

    if (!element) {
      res.status(404).json({ message: "element not found" });
      return;
    }

    await client.element.update({
      where: {
        id: elementId,
      },
      data: {
        imageUrl: parser.data.imageUrl,
      },
    });

    res.status(200).json({ message: "Element updated successfully" });
  }
};

export const createAvatar = async (req: Request, res: Response) => {
  const parser = CreateAvatarSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(400).json({ message: "Validation failed" });
    return;
  } else {
    const avatar = await client.avatar.create({
      data: {
        name: parser.data.name,
        imageUrl: parser.data.imageUrl,
      },
    });

    if (!avatar) {
      res.status(500).json({ message: "Error creating avatar" });
    }

    res.status(200).json({
      id: avatar.id,
    });
  }
};

export const createMap = async (req: Request, res: Response) => {
  const parser = CreateMapSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(400).json({ message: "Validation failed" });
  } else {
    const map = await client.map.create({
      data: {
        width: parseInt(parser.data.dimensions.split("x")[0]!),
        height: parseInt(parser.data.dimensions.split("x")[1]!),
        name: parser.data.name,
        thumbnail: parser.data.thumbnail,
        mapElements: {
          create: parser.data.defaultElements.map((e) => ({
            elementId: e.elementId,
            x: e.x,
            y: e.y,
          })),
        },
      },
    });

    if (!map) {
      res.status(500).json({ message: "failed creating map" });
    }

    res.status(200).json({
      id: map.id,
    });
  }
};
