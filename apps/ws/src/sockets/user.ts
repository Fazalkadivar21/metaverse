import { WebSocket } from "ws";
import client from "@repo/db/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RoomManager } from "../manager/RoomManager";
import { SpaceManager } from "../manager/SpaceMannager";

interface joinObj {
  spaceId: string;
  token: string;
}

type Position = { x: number; y: number };

function getRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class User {
  public id: string;
  public userId?: string;
  private spaceId?: string;
  private x: number;
  private y: number;
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.id = getRandomString(16);
    this.x = 0;
    this.y = 0;
    this.ws = ws;
  }

  public getUsers(spaceId: string) {
    const users: Position[] =
      RoomManager.getInstance()
        .rooms.get(spaceId)
        ?.filter((x) => x.id !== this.id)
        ?.map((u) => ({ x: u.x, y: u.y })) ?? [];
    return users;
  }

  public getX() {
    return this.x;
  }

  public getY() {
    return this.y;
  }

  private spawn(
    spaceId: string,
    elements: Position[],
    height: number,
    width: number
  ) {
    const users = this.getUsers(spaceId);

    const generateCoords = (): void => {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);

      const isCollision = [...elements, ...users].some(
        (p) => p.x === x && p.y === y
      );

      if (isCollision) {
        return generateCoords();
      }

      this.x = x;
      this.y = y;
      RoomManager.getInstance().addUser(spaceId, this);
    };

    generateCoords();
  }

  public async join(data: joinObj) {
    try {
      const { id } = jwt.verify(
        data.token,
        process.env.JWT_SECRET!
      ) as JwtPayload;
      if (!id) {
        this.ws.close();
        return;
      }
      this.userId = id;

      const space = await SpaceManager.getInstance().setSpace(data.spaceId);
      if (!space) {
        this.ws.close();
        return;
      }

      this.spaceId = space.id;

      this.spawn(space.id, space.elements, space.height, space.width);
      this.send({
        type: "space-joined",
        payload: {
          spawn: {
            x: this.x,
            y: this.y,
          },
          users:
            RoomManager.getInstance()
              .rooms.get(this.spaceId)
              ?.filter((x) => x.id !== this.id)
              ?.map((u) => ({ id: u.id })) ?? [],
        },
      });

      RoomManager.getInstance().broadcast(
        {
          type: "user-joined",
          payload: {
            userId: this.userId,
            x: this.x,
            y: this.y,
          },
        },
        this,
        this.spaceId!
      );
    } catch (error) {
      console.error("Error joining space:", error);
      this.ws.close();
    }
  }

  public move(position: Position) {
    const { height, width } = SpaceManager.getInstance().getSpaceDimensions(
      this.spaceId!
    )!;
    const xDis = Math.abs(this.x - position.x);
    const yDis = Math.abs(this.y - position.y);

    if (((xDis == 1 && yDis == 0) || (xDis == 0 && yDis == 1)) && 0 <= position.x && position.x < width && 0 <= position.y && position.y < height ) {
      const elements = SpaceManager.getInstance().getSpaceElements(
        this.spaceId!
      );
      const isCollision = elements?.some((p) => p.x === position.x && p.y === position.y && p.static);

      if (!isCollision) {
        this.x = position.x;
        this.y = position.y;

        RoomManager.getInstance().broadcast(
          {
            type: "user-moved",
            payload: { userId: this.userId, x: this.x, y: this.y },
          },
          this,
          this.spaceId!
        );
      } else {
        this.send({
          type: "movement-rejected",
          payload: { x: this.x, y: this.y },
        });
      }
    } else {
      this.send({
        type: "movement-rejected",
        payload: { x: this.x, y: this.y },
      });
    }
  }

  public send(message: any) {
    this.ws.send(JSON.stringify(message));
  }

  destroy() {
    RoomManager.getInstance().broadcast(
      {
        type: "user-left",
        payload: {
          userId: this.userId,
        },
      },
      this,
      this.spaceId!
    );
    RoomManager.getInstance().removeUser(this, this.spaceId!);
  }
}
