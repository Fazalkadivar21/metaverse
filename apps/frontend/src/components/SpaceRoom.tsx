import React, { useEffect, useRef, useState } from "react";

type Player = { id: string; x: number; y: number; userId?: string };
type Incoming =
  | { type: "space-joined"; payload: any }
  | { type: "user-joined"; payload: any }
  | { type: "user-moved"; payload: any }
  | { type: "user-left"; payload: any }
  | { type: string; payload?: any };

export function SpaceRoom({
  spaceId,
  dims,
}: {
  spaceId: string;
  dims: string;
}) {
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [selfId, setSelfId] = useState<string | null>(null);
  const [spawn, setSpawn] = useState<{ x: number; y: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const token = localStorage.getItem("token") ?? "";

  // Robust dims parsing (e.g. "20x15" -> [20, 15]). Fallback to 20x20.
  const [width, height] = ((): [number, number] => {
    try {
      const parts = (dims ?? "20x20").split("x");
      const w = Number.parseInt(parts[0], 10);
      const h = Number.parseInt(parts[1], 10);
      return [
        Number.isFinite(w) && w > 0 ? w : 20,
        Number.isFinite(h) && h > 0 ? h : 20,
      ];
    } catch {
      return [20, 20];
    }
  })();

  // keep authoritative local position for this client
  const posRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001");
    wsRef.current = ws;

    const onOpen = () => {
      try {
        ws.send(JSON.stringify({ type: "join", payload: { spaceId, token } }));
      } catch (err) {
        console.error("ws send join error", err);
      }
    };

    const onMessage = (ev: MessageEvent) => {
      try {
        const data: Incoming = JSON.parse(ev.data);
        // console.log("ws recv:", data);
        switch (data.type) {
          case "space-joined": {
            // Payload may include: spawn, users[], you (your id) etc.
            const payload = data.payload ?? {};
            const spawnPos = payload.spawn ?? { x: 0, y: 0 };
            setSpawn(spawnPos);
            posRef.current = { x: spawnPos.x, y: spawnPos.y };

            // Use server-assigned id for self if provided (you, clientId, me, etc.)
            const serverSelfId =
              payload.you?.id ?? payload.clientId ?? payload.me?.id ?? null;
            const myId = serverSelfId ?? "self";

            setSelfId(myId);

            const pMap: Record<string, Player> = {};

            // Add self
            pMap[myId] = { id: myId, x: spawnPos.x, y: spawnPos.y, userId: "me" };

            // Add other users if provided; accept either id or userId
            const otherUsers: any[] = payload.users ?? payload.players ?? [];
            otherUsers.forEach((o) => {
              const id = o.id ?? o.clientId ?? o.userId ?? Math.random().toString(36).slice(2, 9);
              const uid = o.userId ?? o.user ?? id;
              const x = Number.isFinite(o.x) ? o.x : 0;
              const y = Number.isFinite(o.y) ? o.y : 0;
              if (id === myId) {
                // if server included us in the users list, ensure posRef matches
                posRef.current = { x, y };
                pMap[id] = { id, x, y, userId: uid };
              } else {
                pMap[id] = { id, x, y, userId: uid };
              }
            });

            setPlayers(pMap);
            break;
          }

          case "user-joined": {
            const payload = data.payload ?? {};
            const id = payload.id ?? payload.clientId ?? payload.userId ?? Math.random().toString(36).slice(2, 9);
            const uid = payload.userId ?? payload.user ?? id;
            const x = Number.isFinite(payload.x) ? payload.x : 0;
            const y = Number.isFinite(payload.y) ? payload.y : 0;

            setPlayers((prev) => {
              if (prev[id]) return prev; // already present
              return { ...prev, [id]: { id, x, y, userId: uid } };
            });
            break;
          }

          case "user-moved": {
            const payload = data.payload ?? {};
            // Accept either id or userId
            const id = payload.id ?? payload.clientId ?? null;
            const userId = payload.userId ?? payload.user ?? null;
            const x = Number.isFinite(payload.x) ? payload.x : null;
            const y = Number.isFinite(payload.y) ? payload.y : null;
            if (x === null || y === null) break;

            setPlayers((prev) => {
              const copy = { ...prev };

              // Find the player key: prefer explicit id, else match userId, else fallback to userId as key
              let key: string | undefined;
              if (id && copy[id]) key = id;
              else if (userId) {
                key = Object.keys(copy).find((k) => copy[k].userId === userId);
              }
              // If still not found, check if userId can be used as key
              if (!key) key = id ?? userId ?? null;

              if (!key) return copy;

              copy[key] = { id: key, userId: userId ?? copy[key]?.userId, x, y };

              // If server says self moved, reconcile posRef (authoritative)
              if (selfId && (key === selfId || (userId && copy[key]?.userId === (players[key]?.userId ?? userId)) ) ) {
                // update authoritative position for self
                if (key === selfId) {
                  posRef.current = { x, y };
                } else if (copy[key]?.userId === "me" && key === selfId) {
                  posRef.current = { x, y };
                }
              }

              return copy;
            });
            break;
          }

          case "user-left": {
            const payload = data.payload ?? {};
            const id = payload.id ?? null;
            const userId = payload.userId ?? null;

            setPlayers((prev) => {
              const copy = { ...prev };
              if (id && copy[id]) {
                delete copy[id];
                return copy;
              }
              // otherwise find by userId
              const key = userId
                ? Object.keys(copy).find((k) => copy[k].userId === userId)
                : undefined;
              if (key) delete copy[key];
              return copy;
            });
            break;
          }

          default:
            console.warn("ws unknown message type:", data.type, data);
        }
      } catch (err) {
        console.error("ws parse error", err);
      }
    };

    const onClose = (ev: CloseEvent) => {
      console.info("ws closed", ev);
      // keep wsRef cleared in cleanup below
    };

    const onError = (err: Event) => {
      console.error("ws error", err);
    };

    ws.addEventListener("open", onOpen);
    ws.addEventListener("message", onMessage);
    ws.addEventListener("close", onClose);
    ws.addEventListener("error", onError);

    return () => {
      try {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("message", onMessage);
        ws.removeEventListener("close", onClose);
        ws.removeEventListener("error", onError);
      } catch (e) {
        // ignore
      }
      try {
        ws.close();
      } catch {}
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [spaceId, token, selfId]); // selfId is included to allow reconciliation when it becomes known

  // keep posRef in sync when spawn arrives/changes
  useEffect(() => {
    if (spawn) posRef.current = { x: spawn.x, y: spawn.y };
  }, [spawn]);

  // keyboard movement (WASD)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (!posRef.current || !selfId) return;

      const key = e.key.toLowerCase();
      if (!["w", "a", "s", "d"].includes(key)) return;

      const cur = { ...posRef.current };
      const target = { x: cur.x, y: cur.y };

      if (key === "w") target.y -= 1;
      if (key === "s") target.y += 1;
      if (key === "a") target.x -= 1;
      if (key === "d") target.x += 1;

      if (
        target.x < 0 ||
        target.y < 0 ||
        target.x >= width ||
        target.y >= height
      )
        return;

      // send move to server
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "move",
            payload: { spaceId, token, x: target.x, y: target.y },
          })
        );
      } catch (err) {
        console.error("ws send move error", err);
      }

      // optimistic update: update local posRef and player map immediately
      posRef.current = target;
      setPlayers((p) => ({
        ...p,
        [selfId]: {
          ...(p[selfId] || { id: selfId, userId: "me" }),
          x: target.x,
          y: target.y,
        },
      }));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // dependencies: width/height/spaceId/token/selfId are intentionally included
  }, [spaceId, width, height, token, selfId]);

  // Build grid cells
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // find first player in cell (non-deterministic if multiple share same spot)
      const byCell = Object.values(players).find((p) => p.x === x && p.y === y);
      const label = byCell ? (byCell.id === selfId ? "You" : "P") : "";
      cells.push(
        <div key={`${x}-${y}`} className="cell" data-x={x} data-y={y}>
          {label}
        </div>
      );
    }
  }

  return (
    <div className="room">
      <h3>
        Space: {spaceId} — {width}x{height}
      </h3>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${width}, 28px)`,
          width: width * 28,
        }}
      >
        {cells}
      </div>
      <div className="legend">
        <div>
          <strong>Controls:</strong> WASD to move
        </div>
        <div>Note: janky demo — collisions will be enforced by server.</div>
      </div>
    </div>
  );
}