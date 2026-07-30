import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@supabase/supabase-js";

import "./index.css";
import App from "./App";
import Login from "./components/Login";
import { supabase } from "./services/supabase";

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuevaSession) => {
      setSession(nuevaSession);
      setCargando(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (cargando) {
    return <div>Cargando...</div>;
  }

const parametroPublico = new URLSearchParams(
  window.location.hash.replace(/^#/, "")
).get("propuesta");

const esEnlacePublico = Boolean(parametroPublico);

return session || esEnlacePublico ? <App /> : <Login />;}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);