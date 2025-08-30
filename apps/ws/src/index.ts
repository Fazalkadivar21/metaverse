import { WebSocketServer } from "ws";
import { User } from "./sockets/user";
import dotenv from "dotenv";

dotenv.config();

const wss = new WebSocketServer({ port: 3001 });

try {
  wss.on("connection", function connection(ws) {
    const user = new User(ws);

    ws.on("message", (msg) => {
      const data = JSON.parse(msg.toString());

      if (!data.payload?.spaceId || !data.payload?.token) {
            console.error("Invalid join payload:", data.payload);
            ws.close();
            return;
          }

      switch (data.type) {
        case "join":
          user.join(data.payload);
          break;
        case "move":
          user.move(data.payload);
          break;
      }
    });
    
    ws.on("close", () => {
      user.destroy();
    });
  });
} catch (error) {
  console.error("Error handling WebSocket connection:", error);
}
