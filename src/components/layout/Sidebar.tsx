import type { ReactNode } from "react";
import "../../styles/sidebar.css";

type SidebarProps = {
  pantalla: string;
  propuestas: unknown[];
  asesorNombre: string;
  abrirNuevaPropuesta: () => void;
  setPantalla: (pantalla: "inicio" | "propuestas" | "catalogo" | "configuracion" | "clientes" | "financiacion" | "reportes") => void;
  cerrarSesion: () => void;
};

type IconName = "plus" | "dashboard" | "document" | "users" | "car" | "box" | "credit" | "chart" | "settings" | "logout";

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    car: <><path d="m5 17-2-2 2-6h14l2 6-2 2M5 9l2-4h10l2 4M5 17v3M19 17v3M7 14h.01M17 14h.01M5 17h14" /></>,
    box: <><path d="m21 8-9 5-9-5 9-5 9 5Z" /><path d="m3 8 9 5 9-5v8l-9 5-9-5Z" /><path d="M12 13v8" /></>,
    credit: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l-2.8 2.8a1.7 1.7 0 0 0-1.8-.3A1.7 1.7 0 0 0 14 21h-4a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-2.8-2.8a1.7 1.7 0 0 0 .3-1.8A1.7 1.7 0 0 0 3 14v-4a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l2.8-2.8a1.7 1.7 0 0 0 1.8.3A1.7 1.7 0 0 0 10 3h4a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.8-.3l2.8 2.8a1.7 1.7 0 0 0-.3 1.8A1.7 1.7 0 0 0 21 10v4a1.7 1.7 0 0 0-1.6 1Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Sidebar({ pantalla, propuestas, asesorNombre, abrirNuevaPropuesta, setPantalla, cerrarSesion }: SidebarProps) {
  const iniciales = (asesorNombre || "Asesor").split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
  const clase = (destino: string) => pantalla === destino ? "nx-menu-item active" : "nx-menu-item";

  return (
    <aside className="nx-sidebar">
      <div className="nx-logo"><img src="/brand/nexora-wordmark.svg" alt="NEXORA" /></div>
      <button className="nx-primary-action" onClick={abrirNuevaPropuesta}><NavIcon name="plus" /><span>Nueva propuesta</span></button>
      <nav className="nx-menu" aria-label="Navegación principal">
        <p className="nx-menu-label">GESTIÓN</p>
        <button className={clase("inicio")} onClick={() => setPantalla("inicio")}><NavIcon name="dashboard" /><span>Panel general</span></button>
        <button className={clase("propuestas")} onClick={() => setPantalla("propuestas")}><NavIcon name="document" /><span>Propuestas</span><div className="nx-badge">{propuestas.length}</div></button>
        <button className={clase("clientes")} onClick={() => setPantalla("clientes")}><NavIcon name="users" /><span>Clientes</span></button>
        <p className="nx-menu-label nx-menu-label-space">RECURSOS</p>
        <button className={clase("catalogo")} onClick={() => setPantalla("catalogo")}><NavIcon name="car" /><span>Vehículos</span></button>
        <button className="nx-menu-item" onClick={() => setPantalla("catalogo")}><NavIcon name="box" /><span>Accesorios</span></button>
        <button className={clase("financiacion")} onClick={() => setPantalla("financiacion")}><NavIcon name="credit" /><span>Financiación</span></button>
        <button className={clase("reportes")} onClick={() => setPantalla("reportes")}><NavIcon name="chart" /><span>Reportes</span></button>
        <button className={clase("configuracion")} onClick={() => setPantalla("configuracion")}><NavIcon name="settings" /><span>Configuración</span></button>
      </nav>
      <div className="nx-sidebar-footer">
        <div className="nx-sidebar-brand"><img src="/brand/byd-logo.svg" alt="BYD" /></div>
        <div className="nx-user">
          <div className="nx-user-avatar">{iniciales}</div>
          <div><strong>{asesorNombre || "Asesor comercial"}</strong><small>Asesor comercial</small></div>
          <button className="nx-user-logout" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión"><NavIcon name="logout" /></button>
        </div>
      </div>
    </aside>
  );
}
