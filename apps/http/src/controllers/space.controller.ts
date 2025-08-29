import client from "@repo/db/client";
import { Request, Response } from "express";
import {
  CreateSpaceSchema,
  AddElementSchema,
  DeleteElementSchema,
} from "../types";

export const createSpace = async (req: Request, res: Response) => {
  const parser = CreateSpaceSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const dimensions = parser.data.dimensions
    .split("x")
    .map((dim) => parseInt(dim));

  try {
    if (!parser.data.mapId) {
      const space = await client.space.create({
        data: {
          name: parser.data.name,
          width: dimensions[0]!,
          height: dimensions[1]!,
          creatorId: req.user!.userId,
        },
      });

      res.status(201).json({ spaceId: space.id });
    } else {
      const map = await client.map.findFirst({
        where: {
          id: parser.data.mapId,
        },
        select: {
          mapElements: true,
          width: true,
          height: true,
        },
      });

      if (!map) {
        res.status(404).json({ message: "Map not found" });
        return;
      }

      const space = await client.$transaction(async () => {
        const space = await client.space.create({
          data: {
            name: parser.data.name,
            width: map.width,
            height: map.height,
            creatorId: req.user!.userId,
          },
        });

        await client.spaceElements.createMany({
          data: map.mapElements.map((e) => ({
            elementId: e.elementId,
            spaceId: space.id,
            x: e.x!,
            y: e.y!,
          })),
        });

        return space;
      });
      res.status(201).json({ spaceId: space.id });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to create space" });
  }
};

export const deleteSpace = async (req: Request, res: Response) => {
  const spaceId = req.params.spaceId;

  if (!spaceId) {
    res.status(400).json({ message: "Space ID is required" });
    return;
  }

  try {
    const space = await client.space.findFirst({
      where: {
        id: spaceId,
      },
      select: {
        creatorId: true,
      },
    });
    if (!space) {
      res.status(404).json({ message: "Space not found" });
      return;
    }

    if (space.creatorId !== req.user!.userId) {
      res.status(403).json({ message: "Forbidden request" });
      return;
    }

    await client.space.delete({
      where: {
        id: spaceId,
      },
    });

    res.status(204).json({ message: "Space deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting space" });
    return;
  }
};

export const getSpaces = async (req: Request, res: Response) => {
  try {
    const spaces = await client.space.findMany({
      where: {
        creatorId: req.user!.userId,
      },
    });

    res.json({
      spaces: spaces.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail,
        dimensions: `${s.width}x${s.height}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching spaces" });
  }
};

export const getSpace = async (req: Request, res: Response) => {
  const spaceId = req.params.spaceId;

  if (!spaceId) {
    res.status(400).json({ message: "Invalid data" });
  } else {
    const space = await client.space.findFirst({
      where: {
        id: spaceId,
      },
      include: {
        elements: {
          include: {
            element: true,
          },
        },
      },
    });

    if (!space) {
      res.status(404).json({ message: "space not found." });
      return;
    }

    res.status(200).json({
      dimensions: `${space.width}x${space.height}`,
      elements: space.elements.map((e) => ({
        id: e.id,
        element: {
          id: e.element.id,
          imageUrl: e.element.imageUrl,
          width: e.element.width,
          height: e.element.height,
          static: e.element.static,
        },
        x: e.x,
        y: e.y,
      })),
    });
  }
};

export const addElement = async (req: Request, res: Response) => {
  try {
    const parser = AddElementSchema.safeParse(req.body);

    if (!parser.success) {
      res.status(400).json({ message: "Validation failed" });
    } else {
      const space = await client.space.findFirst({
        where: {
          id: parser.data.spaceId,
        },
        select: {
          creatorId: true,
          width: true,
          height: true,
        },
      });
      if (!space) {
        res.status(404).json({ message: "Space not found." });
        return;
      }

      if (
        req.body.x < 0 ||
        req.body.y < 0 ||
        req.body.x > space.width! ||
        req.body.y > space.height!
      ) {
        res.status(400).json({ message: "Point is outside of the boundary" });
        return;
      }

      const element = await client.element.findFirst({
        where: {
          id: parser.data.elementId,
        },
      });
      if (!element) {
        res.status(404).json({ message: "element not found." });
        return;
      }

      if (space.creatorId !== req.user!.userId) {
        res.status(403).json({ message: "Forbiden request." });
      }

      const newElement = await client.spaceElements.create({
        data: {
          elementId: parser.data.elementId,
          spaceId: parser.data.spaceId,
          x: parser.data.x,
          y: parser.data.x,
        },
      });

      res.status(200).json({
        message: "Element added successfully",
      });
    }
  } catch (error) {}
};

export const deleteElement = async (req: Request, res: Response) => {
  const parser = DeleteElementSchema.safeParse(req.body);
  if (!parser.success) {
    res.status(400).json({ message: "Validation failed" });
  } else {
    const spaceElement = await client.spaceElements.findFirst({
      where: {
        id: parser.data.id,
      },
      include: {
        space: true,
      },
    });
    if (!spaceElement || spaceElement.space.creatorId !== req.user!.userId) {
      res.status(403).json({ message: "Unauthorised" });
    }
    await client.spaceElements.delete({
      where: {
        id: parser.data.id,
      },
    });
    res.json({ message: "Element deleted" });
  }
};

export const getElements = async (req: Request, res: Response) => {
  const elements = await client.element.findMany();

  res.status(200).json({
    elements: elements.map((e) => ({
      id: e.id,
      imageUrl: e.imageUrl,
      width: e.width,
      height: e.height,
      static: e.static,
    })),
  });
};
