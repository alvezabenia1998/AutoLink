import "../../styles/sidebar.css";

type SidebarProps = {
  pantalla: string;
  propuestas: any[];
  abrirNuevaPropuesta: () => void;
  setPantalla: any;
  cerrarSesion: () => void;
};

export default function Sidebar({
  pantalla,
  propuestas,
  abrirNuevaPropuesta,
  setPantalla,
  cerrarSesion,
}: SidebarProps) {
  return (
    <aside className="nx-sidebar">

      <div className="nx-logo">

        <div className="nx-logo-icon">
          NX
        </div>

        <div>
          <h1>NEXORA</h1>
          <p>CRM Comercial</p>
        </div>

      </div>

      <div className="nx-menu">

        <button
          className="nx-primary-button"
          onClick={abrirNuevaPropuesta}
        >
          ＋ Nueva propuesta
        </button>

        <button
          className={pantalla === "inicio"
            ? "nx-menu-item active"
            : "nx-menu-item"}
          onClick={() => setPantalla("inicio")}
        >
          <span>🏠</span>

          Dashboard
        </button>

        <button
          className={pantalla === "propuestas"
            ? "nx-menu-item active"
            : "nx-menu-item"}
          onClick={() => setPantalla("propuestas")}
        >
          <span>📄</span>

          Propuestas

          <div className="nx-badge">
            {propuestas.length}
          </div>

        </button>

        <button
          className={pantalla === "catalogo"
            ? "nx-menu-item active"
            : "nx-menu-item"}
          onClick={() => setPantalla("catalogo")}
        >
          <span>🚗</span>

          Catálogo
        </button>

        <button
          className={pantalla === "configuracion"
            ? "nx-menu-item active"
            : "nx-menu-item"}
          onClick={() => setPantalla("configuracion")}
        >
          <span>⚙</span>

          Configuración
        </button>

      </div>

      <div className="nx-sidebar-footer">

        <div className="nx-cloud">

          <div className="nx-cloud-dot"></div>

          Guardado en la nube

        </div>

        <button
          className="nx-logout"
          onClick={cerrarSesion}
        >
          🚪 Cerrar sesión
        </button>

      </div>

    </aside>
  );
}