import { useState, type FormEvent } from "react";
import { supabase } from "../services/supabase";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async (evento: FormEvent) => {
    evento.preventDefault();
    setMensaje("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMensaje("El correo o la contraseña no son correctos.");
      setCargando(false);
      return;
    }

    window.location.reload();
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <img className="login-wordmark" src="/brand/nexora-wordmark.svg" alt="NEXORA" />
        <div className="login-brand-copy">
          <span>CRM COMERCIAL</span>
          <h1>Propuestas profesionales para una nueva movilidad.</h1>
          <p>Gestioná vehículos, clientes y operaciones BYD desde un único lugar.</p>
        </div>
        <div className="login-brand-footer">
          <img src="/brand/byd-logo.svg" alt="BYD" />
          <span>BYD ARGENDREAMS</span>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={iniciarSesion}>
          <div className="login-mobile-logo"><img src="/brand/nexora-wordmark.svg" alt="NEXORA" /></div>
          <span className="login-eyebrow">ACCESO SEGURO</span>
          <h2>Bienvenido a Nexora</h2>
          <p className="login-subtitle">Ingresá con tu cuenta para continuar al panel comercial.</p>

          <label htmlFor="login-email">Correo electrónico</label>
          <div className="login-input-wrap">
            <span aria-hidden="true">@</span>
            <input id="login-email" type="email" autoComplete="email" placeholder="nombre@empresa.com" value={email} onChange={(evento) => setEmail(evento.target.value)} required />
          </div>

          <label htmlFor="login-password">Contraseña</label>
          <div className="login-input-wrap">
            <span aria-hidden="true">•</span>
            <input id="login-password" type="password" autoComplete="current-password" placeholder="Ingresá tu contraseña" value={password} onChange={(evento) => setPassword(evento.target.value)} required />
          </div>

          {mensaje && <p className="login-error" role="alert">{mensaje}</p>}

          <button className="login-submit" type="submit" disabled={cargando}>
            {cargando ? "Ingresando…" : "Ingresar al panel"}
            {!cargando && <span aria-hidden="true">→</span>}
          </button>

          <p className="login-help">Acceso exclusivo para el equipo comercial autorizado.</p>
        </form>
      </section>
    </main>
  );
}
