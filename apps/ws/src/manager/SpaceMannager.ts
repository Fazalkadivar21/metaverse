import client from "@repo/db/client";

type Element = {
  x: number;
  y: number;
  static: boolean;
};

type SpaceData = {
  width: number;
  height: number;
  elements: Element[];
};

export class SpaceManager {
  spaces: Map<string, SpaceData> = new Map();
  static instance: SpaceManager;

  private constructor() {
    this.spaces = new Map();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new SpaceManager();
    }
    return this.instance;
  }

  public async setSpace(spaceId: string) {
    const space = await client.space.findFirst({
      where: { id: spaceId },
      select: {
        id: true,
        height: true,
        width: true,
        elements: {
          select: {
            x: true,
            y: true,
            element: {
              select: {
                static: true,
              },
            },
          },
        },
      },
    });

    if (!space) return;

    this.spaces.set(spaceId, {
      width: space.width,
      height: space.height,
      elements: space.elements.map((e) => ({
        x: e.x,
        y: e.y,
        static: e.element.static,
      })),
    });

    return space;
  }

  public getSpace(spaceId: string) {
    return this.spaces.get(spaceId);
  }

  public getSpaceElements(spaceId: string) {
    return this.spaces.get(spaceId)?.elements ?? [];
  }

  public getSpaceDimensions(spaceId: string) {
    const space = this.spaces.get(spaceId);
    if (!space) return undefined;
    return { width: space.width, height: space.height };
  }
}
