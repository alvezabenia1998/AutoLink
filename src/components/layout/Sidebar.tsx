import "../../styles/sidebar.css";

type SidebarProps = {
  pantalla: string;
  propuestas: unknown[];
  asesorNombre: string;
  abrirNuevaPropuesta: () => void;
  setPantalla: (pantalla: "inicio" | "propuestas" | "catalogo" | "configuracion" | "clientes" | "financiacion" | "reportes") => void;
  cerrarSesion: () => void;
};

export default function Sidebar({
  pantalla,
  propuestas,
  asesorNombre,
  abrirNuevaPropuesta,
  setPantalla,
  cerrarSesion,
}: SidebarProps) {
  const iniciales = (asesorNombre || "Asesor")
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <aside className="nx-sidebar">
      <div className="nx-logo">
        <img src="/brand/nexora-wordmark.svg" alt="NEXORA" />
      </div>

      <nav className="nx-menu" aria-label="Navegación principal">
        <button className={pantalla === "nueva" ? "nx-menu-item active" : "nx-menu-item"} onClick={abrirNuevaPropuesta}>
          <span aria-hidden="true">▤</span> Nueva propuesta
        </button>
        <button className={pantalla === "inicio" ? "nx-menu-item active" : "nx-menu-item"} onClick={() => setPantalla("inicio")}>
          <span aria-hidden="true">⌂</span> Dashboard
        </button>
        <button className={pantalla === "propuestas" ? "nx-menu-item active" : "nx-menu-item"} onClick={() => setPantalla("propuestas")}>
          <span aria-hidden="true">▧</span> Propuestas
          <div className="nx-badge">{propuestas.length}</div>
        </button>
        <button className={pantalla === "clientes" ? "nx-menu-item active" : "nx-menu-item"} type="button" onClick={() => setPantalla("clientes")}>
          <span aria-hidden="true">♙</span> Clientes
        </button>
        <button className={pantalla === "catalogo" ? "nx-menu-item active" : "nx-menu-item"} onClick={() => setPantalla("catalogo")}>
          <span aria-hidden="true">◇</span> Vehículos
        </button>
        <button className="nx-menu-item" type="button" onClick={() => setPantalla("catalogo")}>
          <span aria-hidden="true">▤</span> Accesorios
        </button>
        <button className={pantalla === "financiacion" ? "nx-menu-item active" : "nx-menu-item"} type="button" onClick={() => setPantalla("financiacion")}>
          <span aria-hidden="true">◉</span> Financiación
        </button>
        <button className={pantalla === "reportes" ? "nx-menu-item active" : "nx-menu-item"} type="button" onClick={() => setPantalla("reportes")}>
          <span aria-hidden="true">▥</span> Reportes
        </button>
        <button className={pantalla === "configuracion" ? "nx-menu-item active" : "nx-menu-item"} onClick={() => setPantalla("configuracion")}>
          <span aria-hidden="true">⚙</span> Configuración
        </button>
      </nav>

      <div className="nx-sidebar-footer">
        <div className="nx-sidebar-brand"><img src="/brand/byd-logo.svg" alt="BYD" /></div>
        <div className="nx-user">
          <div className="nx-user-avatar">{iniciales}</div>
          <div><strong>{asesorNombre || "Asesor comercial"}</strong><small>Asesor comercial</small></div>
          <button className="nx-user-logout" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión">↗</button>
        </div>
      </div>
    </aside>
  );
}
