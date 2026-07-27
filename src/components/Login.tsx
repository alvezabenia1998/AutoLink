import { useState } from "react";
import { supabase } from "../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async () => {
    setMensaje("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Correo o contraseña incorrectos.");
    } else {
      setMensaje("Inicio de sesión correcto.");
    }

    setCargando(false);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f6fb",
      }}
    >
      <div
        style={{
          width: 380,
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <h1 style={{ marginBottom: 10, color: "#1a1a1a" }}>Nexora</h1>

        <p style={{ color: "#666", marginBottom: 30 }}>
          Ingresá para administrar tus propuestas.
        </p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            marginBottom: 15,
            borderRadius: 10,
            border: "1px solid #ddd",
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            marginBottom: 20,
            borderRadius: 10,
            border: "1px solid #ddd",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={iniciarSesion}
          disabled={cargando}
          style={{
            width: "100%",
            padding: 14,
            border: "none",
            borderRadius: 10,
            background: "#16a34a",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>

        {mensaje && (
          <p
            style={{
              marginTop: 16,
              color: mensaje.includes("correcto") ? "#16a34a" : "#dc2626",
            }}
          >
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}