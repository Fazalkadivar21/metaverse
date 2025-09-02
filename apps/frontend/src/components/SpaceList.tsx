import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";

export function SpaceList({ onCreate, onJoin }: { onCreate: (spaceId: string, dims: string) => void; onJoin: (spaceId: string, dims: string) => void; }) {
  const [spaces, setSpaces] = useState<{ id: string; name: string; dimensions: string }[]>([]);
  const [name, setName] = useState("My janky space");
  const [dimensions, setDimensions] = useState("20x12");
  const [joinId, setJoinId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/space", { method: "GET" });
    if (res.ok && res.body?.spaces) {
      setSpaces(res.body.spaces);
    } else {
      setMessage("Failed to load spaces");
    }
  }

  useEffect(() => { load(); }, []);

  async function createSpace() {
    setMessage(null);
    const res = await apiFetch("/space", { method: "POST", body: JSON.stringify({ name, dimensions }) });
    if (res.ok && res.body?.spaceId) {
      setMessage("Created space: " + res.body.spaceId);
      setSpaces((s) => [...s, { id: res.body.spaceId, name, dimensions }]);
      onCreate(res.body.spaceId, dimensions);
    } else {
      setMessage("Create failed: " + JSON.stringify(res.body));
    }
  }

  async function joinById() {
    setMessage(null);
    if (!joinId) {
      setMessage("Enter a space id to join");
      return;
    }

    // Try to fetch the space metadata (dimensions) before joining.
    const res = await apiFetch(`/space/${encodeURIComponent(joinId)}`, { method: "GET" });
    if (res.ok) {
      // support both shapes: { space: { dimensions } } or { dimensions }
      const dims = res.body?.space?.dimensions ?? res.body?.dimensions ?? null;
      if (dims) {
        onJoin(joinId, dims);
        return;
      }
    }

    setMessage("Failed to join: space not found or missing dimensions");
  }

  return (
    <div>
      <div className="card">
        <h2>Your Spaces</h2>
        <div className="space-grid">
          {spaces.map((s) => (
            <div key={s.id} className="space-item">
              <div><strong>{s.name}</strong></div>
              <div>{s.dimensions}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => onJoin(s.id, s.dimensions)}>Join</button>
              </div>
            </div>
          ))}
          {spaces.length === 0 && <div>No spaces yet</div>}
        </div>
      </div>

      <div className="card">
        <h3>Create Space</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>Dimensions (WIDTHxHEIGHT)</label>
        <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button onClick={createSpace}>Create</button>
        </div>
        {message && <div className="message">{message}</div>}
      </div>

      <div className="card">
        <h3>Join by ID</h3>
        <label>Space ID</label>
        <input value={joinId} onChange={(e) => setJoinId(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button onClick={joinById}>Join by ID</button>
        </div>
      </div>
    </div>
  );
}
