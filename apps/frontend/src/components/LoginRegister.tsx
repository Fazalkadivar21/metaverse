import React, { useState } from "react";
import { apiFetch } from "../api";

export function LoginRegister({ onLogin }: { onLogin: (token: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const path = isRegister ? "/users/register" : "/users/login";
      const resp = await apiFetch(path, { method: "POST", body: JSON.stringify({ username, password, type: "user" }) });
      if (!resp.ok) {
        setMessage(`Error ${resp.status}: ${resp.body?.message ?? JSON.stringify(resp.body)}`);
        return;
      }
      const token = resp.body?.token;
      if (!token) {
        setMessage("No token returned, but maybe cookie is set. Trying to continue.");
        onLogin("");
        return;
      }
      onLogin(token);
    } catch (err: any) {
      setMessage(String(err));
    }
  }

  return (
    <div className="card">
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={submit}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button type="submit">{isRegister ? "Register" : "Login"}</button>
          <button type="button" onClick={() => setIsRegister(!isRegister)} style={{ marginLeft: 8 }}>
            {isRegister ? "Switch to Login" : "Switch to Register"}
          </button>
        </div>
      </form>
      {message && <div className="message">{message}</div>}
      <small>Tip: backend sets httpOnly cookie + returns token; this UI stores token too for WS.</small>
    </div>
  );
}
