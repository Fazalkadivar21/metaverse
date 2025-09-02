import React, { useEffect, useState } from "react";
import { LoginRegister } from "./components/LoginRegister";
import { SpaceList } from "./components/SpaceList";
import { SpaceRoom } from "./components/SpaceRoom";

type View = { name: "auth" } | { name: "list" } | { name: "room"; spaceId: string; dims: string };

export default function App() {
  const [view, setView] = useState<View>({ name: "auth" });
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    if (localStorage.getItem("token")) {
      setView({ name: "list" });
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>Janky Gather</h1>
        <div>
          {token && <button onClick={() => { localStorage.removeItem("token"); setToken(null); setView({ name: "auth" }); }}>Logout</button>}
        </div>
      </header>

      <main className="main">
        {view.name === "auth" && (
          <LoginRegister
            onLogin={(t) => { localStorage.setItem("token", t); setToken(t); setView({ name: "list" }); }}
          />
        )}

        {view.name === "list" && token && (
          <SpaceList
            onCreate={(spaceId, dims) => setView({ name: "room", spaceId, dims })}
            onJoin={(spaceId, dims) => setView({ name: "room", spaceId, dims })}
          />
        )}

        {view.name === "room" && token && (
          <div style={{ width: "100%" }}>
            <button onClick={() => setView({ name: "list" })}>Back to spaces</button>
            <SpaceRoom spaceId={view.spaceId} dims={view.dims} />
          </div>
        )}
      </main>

      <footer className="footer">Janky demo — move with WASD</footer>
    </div>
  );
}
