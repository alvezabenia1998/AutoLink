import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "./services/supabase";
import "./styles.css";
import Sidebar from "./components/layout/Sidebar";

type Pantalla =
  | "inicio"
  | "nueva"
  | "propuestas"
  | "catalogo"
  | "configuracion"
  | "vistaCliente";

type FormaCompra = "contado" | "credito";

type TipoGasto = "sin-gastos" | "flete-formulario" | "patentamiento-completo";

type ColorVehiculo = {
  id: string;
  nombre: string;
  codigo: string;
  imagen: string;
};

type Cargador = {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  incluidoPorDefecto: boolean;
};

type ModeloVehiculo = {
  id: string;
  nombre: string;
  tipo: string;
  versiones: string[];
  garantia: string;
  descripcion: string;
  colores: ColorVehiculo[];
  cargadores: Cargador[];
};

type AccesoriosSeleccionados = {
  polarizado: boolean;
  tuercas: boolean;
  alfombras: boolean;
  patentamiento: boolean;
};

type Propuesta = {
  id: string;
  fecha: string;
  cliente: string;
  telefono: string;
  email: string;
  modeloId: string;
  version: string;
  colorId: string;
  formaCompra: FormaCompra;
  precioLista: number;
  bonificacion: number;
  tipoGasto: TipoGasto;
  montoGastos: number;
  anticipo: number;
  cuotas: number;
  valorCuota: number;
  aclaracionCredito: string;
  accesorios: AccesoriosSeleccionados;
  cargadoresIncluidos: string[];
  observaciones: string;
  vigenciaDias: number;
  estado: "Guardada" | "Enviada" | "Interesado";
};

type Asesor = {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  foto: string;
  concesionario: string;
  logo: string;
  textoEntrega: string;
  garantiaPredeterminada: string;
  vigenciaPredeterminada: number;
};

const STORAGE_PROPUESTAS = "autoquote-propuestas-v3";
const STORAGE_CATALOGO = "autoquote-catalogo-v3";
const STORAGE_ASESOR = "autoquote-asesor-v3";


type EstadoNube = "conectando" | "sincronizado" | "offline" | "error";

type PropuestaDatos = {
  propuesta: Propuesta;
  modelo: ModeloVehiculo | null;
  asesor: Asesor | null;
};

type PropuestaFila = {
  id: number | string;
  created_at: string;
  cliente: string;
  telefono: string | null;
  email: string | null;
  modelo_id: string | null;
  color_id: string | null;
  precio: number | null;
  datos: PropuestaDatos | null;
};

const propuestaAFila = (
  propuesta: Propuesta,
  modelo?: ModeloVehiculo,
  asesor?: Asesor
) => ({
  created_at: propuesta.fecha,
  cliente: propuesta.cliente,
  telefono: propuesta.telefono || null,
  email: propuesta.email || null,
  modelo_id: propuesta.modeloId || null,
  color_id: propuesta.colorId || null,
  precio: Math.max(propuesta.precioLista - propuesta.bonificacion, 0),
  datos: {
    propuesta,
    modelo: modelo || null,
    asesor: asesor || null,
  } satisfies PropuestaDatos,
});

const filaAPropuesta = (fila: PropuestaFila): Propuesta => {
  if (fila.datos?.propuesta) {
    return {
      ...fila.datos.propuesta,
      id: fila.datos.propuesta.id || String(fila.id),
    };
  }

  return {
    id: String(fila.id),
    fecha: fila.created_at,
    cliente: fila.cliente || "",
    telefono: fila.telefono || "",
    email: fila.email || "",
    modeloId: fila.modelo_id || "",
    version: "GS",
    colorId: fila.color_id || "",
    formaCompra: "contado",
    precioLista: Number(fila.precio || 0),
    bonificacion: 0,
    tipoGasto: "sin-gastos",
    montoGastos: 0,
    anticipo: 0,
    cuotas: 0,
    valorCuota: 0,
    aclaracionCredito: "",
    accesorios: {
      polarizado: false,
      tuercas: false,
      alfombras: false,
      patentamiento: false,
    },
    cargadoresIncluidos: [],
    observaciones: "",
    vigenciaDias: 5,
    estado: "Guardada",
  };
};

const FOTO_AUTO_ALTERNATIVA =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%271400%27%20height%3D%27800%27%20viewBox%3D%270%200%201400%20800%27%3E%0A%3Cdefs%3E%0A%20%20%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%271%27%20y2%3D%271%27%3E%0A%20%20%20%20%3Cstop%20offset%3D%270%27%20stop-color%3D%27%23f8fafc%27/%3E%0A%20%20%20%20%3Cstop%20offset%3D%271%27%20stop-color%3D%27%23e5e7eb%27/%3E%0A%20%20%3C/linearGradient%3E%0A%3C/defs%3E%0A%3Crect%20width%3D%271400%27%20height%3D%27800%27%20fill%3D%27url%28%23g%29%27/%3E%0A%3Cpath%20d%3D%27M345%20500c35-105%20120-185%20250-210h260c115%2020%20205%2095%20250%20210l80%2015c38%207%2065%2040%2065%2079v38H150v-38c0-39%2027-72%2065-79l130-15z%27%20fill%3D%27%23cbd5e1%27/%3E%0A%3Cpath%20d%3D%27M485%20455c42-75%20105-115%20190-130h150c82%2015%20145%2055%20190%20130H485z%27%20fill%3D%27%2394a3b8%27/%3E%0A%3Ccircle%20cx%3D%27420%27%20cy%3D%27625%27%20r%3D%2772%27%20fill%3D%27%23334155%27/%3E%0A%3Ccircle%20cx%3D%27980%27%20cy%3D%27625%27%20r%3D%2772%27%20fill%3D%27%23334155%27/%3E%0A%3Ccircle%20cx%3D%27420%27%20cy%3D%27625%27%20r%3D%2734%27%20fill%3D%27%23cbd5e1%27/%3E%0A%3Ccircle%20cx%3D%27980%27%20cy%3D%27625%27%20r%3D%2734%27%20fill%3D%27%23cbd5e1%27/%3E%0A%3Ctext%20x%3D%27700%27%20y%3D%27190%27%20text-anchor%3D%27middle%27%20font-family%3D%27Arial%27%20font-size%3D%2744%27%20font-weight%3D%27700%27%20fill%3D%27%23334155%27%3EFOTO%20OFICIAL%20DEL%20VEH%C3%8DCULO%3C/text%3E%0A%3Ctext%20x%3D%27700%27%20y%3D%27245%27%20text-anchor%3D%27middle%27%20font-family%3D%27Arial%27%20font-size%3D%2726%27%20fill%3D%27%2364748b%27%3ECargala%20desde%20Cat%C3%A1logo%20editable%3C/text%3E%0A%3C/svg%3E";

const FOTO_CARGADOR_ALTERNATIVA =
  "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85";

const crearId = (prefijo: string) =>
  `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const catalogoInicial: ModeloVehiculo[] = [
  {
    id: "dolphin-mini",
    nombre: "DOLPHIN MINI",
    tipo: "Hatchback 100% eléctrico",
    versiones: ["GL", "GS"],
    garantia: "6 años o 150.000 km",
    descripcion: "Compacto, eficiente y pensado para la ciudad.",
    colores: [
      {
        id: "dm-white",
        nombre: "Apricity White",
        codigo: "#efefec",
        imagen:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "dm-green",
        nombre: "Sprout Green",
        codigo: "#a8c4aa",
        imagen:
          "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "dm-black",
        nombre: "Polar Night Black",
        codigo: "#151619",
        imagen:
          "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85",
      },
    ],
    cargadores: [
      {
        id: "dm-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador de emergencia para uso doméstico.",
        imagen:
          "https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
      {
        id: "dm-cable",
        nombre: "Cable de carga",
        descripcion: "Cable para puntos de carga compatibles.",
        imagen:
          "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
    ],
  },
  {
    id: "yuan-pro",
    nombre: "YUAN PRO",
    tipo: "SUV 100% eléctrico",
    versiones: ["GL", "GS"],
    garantia: "6 años o 150.000 km",
    descripcion: "SUV eléctrico versátil, amplio y tecnológico.",
    colores: [
      {
        id: "yp-white",
        nombre: "Snow White",
        codigo: "#efefec",
        imagen:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "yp-grey",
        nombre: "Time Grey",
        codigo: "#868b91",
        imagen:
          "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "yp-black",
        nombre: "Obsidian Black",
        codigo: "#17181b",
        imagen:
          "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85",
      },
    ],
    cargadores: [
      {
        id: "yp-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil incluido con la unidad.",
        imagen:
          "https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
      {
        id: "yp-wallbox",
        nombre: "Wallbox",
        descripcion: "Cargador de pared para instalación domiciliaria.",
        imagen:
          "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: false,
      },
    ],
  },
  {
    id: "song-pro",
    nombre: "SONG PRO DM-i",
    tipo: "SUV híbrido enchufable",
    versiones: ["GL", "GS"],
    garantia: "6 años o 150.000 km",
    descripcion: "Espacio familiar con tecnología híbrida enchufable.",
    colores: [
      {
        id: "sp-white",
        nombre: "Snow White",
        codigo: "#efefec",
        imagen:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "sp-grey",
        nombre: "Time Grey",
        codigo: "#858a90",
        imagen:
          "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "sp-black",
        nombre: "Obsidian Black",
        codigo: "#151619",
        imagen:
          "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85",
      },
    ],
    cargadores: [
      {
        id: "sp-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil para recarga domiciliaria.",
        imagen:
          "https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
      {
        id: "sp-cable",
        nombre: "Cable de carga",
        descripcion: "Cable de conexión para puntos de carga.",
        imagen:
          "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
    ],
  },
  {
    id: "atto-2",
    nombre: "ATTO 2 DM-i",
    tipo: "SUV híbrido enchufable",
    versiones: ["GS"],
    garantia: "6 años o 150.000 km",
    descripcion: "SUV compacto, eficiente y tecnológico.",
    colores: [
      {
        id: "a2-white",
        nombre: "Skiing White",
        codigo: "#f1f1ef",
        imagen:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "a2-grey",
        nombre: "Time Grey",
        codigo: "#858a90",
        imagen:
          "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "a2-black",
        nombre: "Obsidian Black",
        codigo: "#151619",
        imagen:
          "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85",
      },
    ],
    cargadores: [
      {
        id: "a2-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil incluido.",
        imagen:
          "https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
    ],
  },
  {
    id: "seal-u",
    nombre: "SEAL U DM-i",
    tipo: "SUV híbrido enchufable",
    versiones: ["GS"],
    garantia: "6 años o 150.000 km",
    descripcion: "Confort, seguridad y autonomía extendida.",
    colores: [
      {
        id: "su-white",
        nombre: "Snow White",
        codigo: "#f0f0ed",
        imagen:
          "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "su-time",
        nombre: "Time Gray",
        codigo: "#85898e",
        imagen:
          "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "su-smoke",
        nombre: "Smoke Gray",
        codigo: "#5f6267",
        imagen:
          "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1600&q=85",
      },
      {
        id: "su-black",
        nombre: "Obsidian Black",
        codigo: "#141518",
        imagen:
          "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85",
      },
    ],
    cargadores: [
      {
        id: "su-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil para la unidad.",
        imagen:
          "https://images.unsplash.com/photo-1597404294360-feeeda04612e?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: true,
      },
      {
        id: "su-wallbox",
        nombre: "Wallbox",
        descripcion: "Cargador de pared para instalación domiciliaria.",
        imagen:
          "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=1200&q=85",
        incluidoPorDefecto: false,
      },
    ],
  },
];

const asesorInicial: Asesor = {
  nombre: "Michael Alvez",
  cargo: "Asesor Comercial BYD",
  telefono: "5491100000000",
  email: "michael@nexora.com",
  foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=85",
  concesionario: "BYD",
  logo: "",
  textoEntrega: "Entrega inmediata",
  garantiaPredeterminada: "6 años o 150.000 km",
  vigenciaPredeterminada: 5,
};

const formatoUSD = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(Math.max(valor || 0, 0));

const formatoPesos = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Math.max(valor || 0, 0));

const leerArchivoComoDataURL = (archivo: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("inicio");
  const [paso, setPaso] = useState(1);

  const [catalogo, setCatalogo] = useState<ModeloVehiculo[]>(catalogoInicial);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [asesor, setAsesor] = useState<Asesor>(asesorInicial);
  const [propuestaAbierta, setPropuestaAbierta] = useState<Propuesta | null>(
    null
  );
  const [modeloPropuestaAbierta, setModeloPropuestaAbierta] =
  useState<ModeloVehiculo | null>(null);

const [asesorPropuestaAbierta, setAsesorPropuestaAbierta] =
  useState<Asesor | null>(null);
const [esEnlacePublico, setEsEnlacePublico] = useState(() => {
  const parametroPublico = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  ).get("propuesta");

  return Boolean(parametroPublico);
});  const [estadoNube, setEstadoNube] = useState<EstadoNube>("conectando");

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const [modeloId, setModeloId] = useState(catalogoInicial[2].id);
  const [version, setVersion] = useState(catalogoInicial[2].versiones[0]);
  const [colorId, setColorId] = useState(catalogoInicial[2].colores[0].id);

  const [formaCompra, setFormaCompra] = useState<FormaCompra>("contado");
  const [precioLista, setPrecioLista] = useState(42500000);
  const [bonificacion, setBonificacion] = useState(2500000);
  const [tipoGasto, setTipoGasto] = useState<TipoGasto>("sin-gastos");
  const [montoGastos, setMontoGastos] = useState(0);
  const [anticipo, setAnticipo] = useState(12000000);
  const [cuotas, setCuotas] = useState(48);
  const [valorCuota, setValorCuota] = useState(632000);
  const [aclaracionCredito, setAclaracionCredito] = useState(
    "Sujeto a aprobación crediticia."
  );

  const [accesorios, setAccesorios] = useState<AccesoriosSeleccionados>({
    polarizado: false,
    tuercas: false,
    alfombras: true,
    patentamiento: false,
  });

  const [cargadoresIncluidos, setCargadoresIncluidos] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [vigenciaDias, setVigenciaDias] = useState(
    asesorInicial.vigenciaPredeterminada
  );

  const [modeloEditandoId, setModeloEditandoId] = useState(
    catalogoInicial[0].id
  );

  useEffect(() => {
    const iniciar = async () => {
      const parametroPublico = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      ).get("propuesta");

      const asesorGuardado = localStorage.getItem(STORAGE_ASESOR);
      const catalogoGuardado = localStorage.getItem(STORAGE_CATALOGO);
      
      if (catalogoGuardado) {
        try {
          const catalogoParseado = JSON.parse(catalogoGuardado);
          if (Array.isArray(catalogoParseado) && catalogoParseado.length > 0) {
            setCatalogo(catalogoParseado);
            setModeloId(catalogoParseado[0].id);
            setVersion(catalogoParseado[0].versiones[0] || "GS");
            setColorId(catalogoParseado[0].colores[0]?.id || "");
            setModeloEditandoId(catalogoParseado[0].id);
          }
        } catch {}
      }

      if (asesorGuardado) {
        try {
          setAsesor(JSON.parse(asesorGuardado));
        } catch {}
      }

try {
  setEstadoNube("conectando");

  const { data: filas, error } = await supabase
    .from("propuestas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const propuestasNube = ((filas ?? []) as PropuestaFila[]).map(
    filaAPropuesta
  );

  setPropuestas(propuestasNube);

  if (parametroPublico) {
    const propuestaEncontrada = propuestasNube.find(
      (propuesta) => propuesta.id === parametroPublico
    );

if (propuestaEncontrada) {
  setPropuestaAbierta(propuestaEncontrada);

  const filaOriginal = filas?.find(
    (fila) => fila.datos?.propuesta?.id === propuestaEncontrada.id
  );

  setModeloPropuestaAbierta(filaOriginal?.datos?.modelo ?? null);
  setAsesorPropuestaAbierta(filaOriginal?.datos?.asesor ?? asesor);

  setEsEnlacePublico(true);
  setPantalla("vistaCliente");
} 
 }

  localStorage.setItem(
    STORAGE_PROPUESTAS,
    JSON.stringify(propuestasNube)
  );

  setEstadoNube("sincronizado");
} catch (error) {
  console.error(
    "No se pudieron cargar las propuestas de Supabase:",
    error
  );

  const propuestasGuardadas =
    localStorage.getItem(STORAGE_PROPUESTAS);

  if (propuestasGuardadas) {
    try {
      const propuestasLocales: Propuesta[] =
        JSON.parse(propuestasGuardadas);

      setPropuestas(propuestasLocales);

      if (parametroPublico) {
        const propuestaEncontrada = propuestasLocales.find(
          (propuesta) => propuesta.id === parametroPublico
        );

        if (propuestaEncontrada) {
          setPropuestaAbierta(propuestaEncontrada);
          setEsEnlacePublico(true);
        }
      }
    } catch {}
  }

  setEstadoNube(navigator.onLine ? "error" : "offline");
}    };

    iniciar();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_PROPUESTAS, JSON.stringify(propuestas));
  }, [propuestas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CATALOGO, JSON.stringify(catalogo));
  }, [catalogo]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ASESOR, JSON.stringify(asesor));
  }, [asesor]);

  const modeloSeleccionado = useMemo(
    () => catalogo.find((modelo) => modelo.id === modeloId) || catalogo[0],
    [catalogo, modeloId]
  );

  const colorSeleccionado =
    modeloSeleccionado?.colores.find((color) => color.id === colorId) ||
    modeloSeleccionado?.colores[0];

  const modeloEditando =
    catalogo.find((modelo) => modelo.id === modeloEditandoId) || catalogo[0];

  const precioFinal = Math.max(precioLista - bonificacion, 0);
  const saldoCredito = Math.max(precioFinal - anticipo, 0);

  const seleccionarModelo = (id: string) => {
    const modelo = catalogo.find((item) => item.id === id);
    if (!modelo) return;

    setModeloId(modelo.id);
    setVersion(modelo.versiones[0] || "GS");
    setColorId(modelo.colores[0]?.id || "");
    setCargadoresIncluidos(
      modelo.cargadores
        .filter((cargador) => cargador.incluidoPorDefecto)
        .map((cargador) => cargador.id)
    );
  };

  const limpiarFormulario = () => {
    const primerModelo = catalogo[0];
    setPaso(1);
    setCliente("");
    setTelefono("");
    setEmail("");
    if (primerModelo) seleccionarModelo(primerModelo.id);
    setFormaCompra("contado");
    setPrecioLista(0);
    setBonificacion(0);
    setTipoGasto("sin-gastos");
    setMontoGastos(0);
    setAnticipo(0);
    setCuotas(48);
    setValorCuota(0);
    setAclaracionCredito("Sujeto a aprobación crediticia.");
    setAccesorios({
      polarizado: false,
      tuercas: false,
      alfombras: true,
      patentamiento: false,
    });
    setObservaciones("");
    setVigenciaDias(asesor.vigenciaPredeterminada);
  };

  const abrirNuevaPropuesta = () => {
    limpiarFormulario();
    setPantalla("nueva");
    window.scrollTo(0, 0);
  };

  const construirPropuesta = (): Propuesta => ({
    id: `AQ-${Date.now().toString().slice(-8)}`,
    fecha: new Date().toISOString(),
    cliente,
    telefono,
    email,
    modeloId,
    version,
    colorId,
    formaCompra,
    precioLista,
    bonificacion,
    tipoGasto,
    montoGastos,
    anticipo: formaCompra === "credito" ? anticipo : 0,
    cuotas: formaCompra === "credito" ? cuotas : 0,
    valorCuota: formaCompra === "credito" ? valorCuota : 0,
    aclaracionCredito: formaCompra === "credito" ? aclaracionCredito : "",
    accesorios,
    cargadoresIncluidos,
    observaciones,
    vigenciaDias,
    estado: "Guardada",
  });

  const guardarYVer = async () => {
    if (!cliente.trim() || !telefono.trim()) {
      alert("Completá el nombre y el teléfono del cliente.");
      setPaso(1);
      return;
    }

    if (!modeloSeleccionado || !colorSeleccionado) {
      alert("Elegí un modelo y un color.");
      setPaso(2);
      return;
    }

    if (precioLista <= 0) {
      alert("Ingresá un precio de lista válido.");
      setPaso(3);
      return;
    }

    if (tipoGasto !== "sin-gastos" && montoGastos <= 0) {
      alert("Ingresá el monto de los gastos.");
      setPaso(3);
      return;
    }

    if (
      formaCompra === "credito" &&
      (anticipo <= 0 || cuotas <= 0 || valorCuota <= 0)
    ) {
      alert("Completá anticipo, cantidad de cuotas y valor de cuota.");
      setPaso(3);
      return;
    }

    const propuesta = construirPropuesta();
    setPropuestas((actuales) => [propuesta, ...actuales]);
    setPropuestaAbierta(propuesta);
    setPantalla("vistaCliente");
    window.scrollTo(0, 0);

    try {
      setEstadoNube("conectando");

      const { error } = await supabase
        .from("propuestas")
        .insert(propuestaAFila(propuesta, modeloSeleccionado, asesor));

      if (error) {
        throw error;
      }

      setEstadoNube("sincronizado");
    } catch (error) {
      console.error("No se pudo guardar en Supabase:", error);
      setEstadoNube(navigator.onLine ? "error" : "offline");

      const mensajeError =
        error instanceof Error ? error.message : "Error desconocido";

      alert(
        `La propuesta quedó guardada en este dispositivo, pero no se pudo sincronizar con la nube.\n\nError: ${mensajeError}`
      );
    }
  };

const abrirPropuesta = (propuesta: Propuesta) => {
  const modelo =
    catalogo.find((item) => item.id === propuesta.modeloId) || null;

  setPropuestaAbierta(propuesta);
  setModeloPropuestaAbierta(modelo);
  setAsesorPropuestaAbierta(asesor);
  setPantalla("vistaCliente");
  window.scrollTo(0, 0);
};
  const eliminarPropuesta = async (id: string) => {
    if (!window.confirm("¿Querés eliminar esta propuesta?")) return;

    const respaldo = propuestas;
    setPropuestas((actuales) =>
      actuales.filter((propuesta) => propuesta.id !== id)
    );

    try {
      setEstadoNube("conectando");

      const { error } = await supabase
        .from("propuestas")
        .delete()
        .eq("datos->propuesta->>id", id);

      if (error) {
        throw error;
      }

      setEstadoNube("sincronizado");
    } catch (error) {
      console.error("No se pudo eliminar en Supabase:", error);
      setPropuestas(respaldo);
      setEstadoNube(navigator.onLine ? "error" : "offline");
      alert("No se pudo eliminar la propuesta de la nube.");
    }
  };

  const actualizarEstado = async (id: string, estado: Propuesta["estado"]) => {
    const propuestaActual = propuestas.find((propuesta) => propuesta.id === id);
    const propuestaActualizada = propuestaActual
      ? { ...propuestaActual, estado }
      : null;

    setPropuestas((actuales) =>
      actuales.map((propuesta) =>
        propuesta.id === id ? { ...propuesta, estado } : propuesta
      )
    );

    setPropuestaAbierta((actual) =>
      actual?.id === id ? { ...actual, estado } : actual
    );

    if (!propuestaActualizada) return;

    try {
      setEstadoNube("conectando");

      const modelo =
        catalogo.find((item) => item.id === propuestaActualizada.modeloId) ||
        null;

      const { error } = await supabase
        .from("propuestas")
        .update({
          datos: {
            propuesta: propuestaActualizada,
            modelo,
            asesor,
          } satisfies PropuestaDatos,
        })
        .eq("datos->propuesta->>id", id);

      if (error) {
        throw error;
      }

      setEstadoNube("sincronizado");
    } catch (error) {
      console.error("No se pudo actualizar el estado en Supabase:", error);
      setEstadoNube(navigator.onLine ? "error" : "offline");
    }
  };

  const abrirWhatsApp = (
    propuesta: Propuesta,
    accion: "consulta" | "reserva" | "testdrive"
  ) => {
    const modelo =
      catalogo.find((item) => item.id === propuesta.modeloId) || catalogo[0];

    let mensaje = `Hola ${asesor.nombre}, vi la propuesta del BYD ${modelo?.nombre} y quiero hacerte una consulta.`;

    if (accion === "reserva") {
      mensaje = `Hola ${asesor.nombre}, quiero avanzar con la reserva del BYD ${modelo?.nombre}, versión ${propuesta.version}.`;
    }

    if (accion === "testdrive") {
      mensaje = `Hola ${asesor.nombre}, quiero coordinar un test drive del BYD ${modelo?.nombre}.`;
    }

    actualizarEstado(propuesta.id, "Interesado");

    window.open(
      `https://wa.me/${asesor.telefono.replace(
        /\D/g,
        ""
      )}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );
  };

  const copiarResumen = async (propuesta: Propuesta) => {
    const modelo =
      catalogo.find((item) => item.id === propuesta.modeloId) || catalogo[0];
    const color =
      modelo?.colores.find((item) => item.id === propuesta.colorId) ||
      modelo?.colores[0];

    const texto = [
      `Propuesta ${propuesta.id}`,
      `Cliente: ${propuesta.cliente}`,
      `Vehículo: BYD ${modelo?.nombre}`,
      `Versión: ${propuesta.version}`,
      `Color: ${color?.nombre}`,
      `Forma de compra: ${
        propuesta.formaCompra === "contado" ? "Contado" : "Crédito"
      }`,
      `Precio final de la unidad: ${formatoUSD(
        propuesta.precioLista - propuesta.bonificacion
      )}`,
      propuesta.montoGastos > 0
        ? `Gastos en pesos: ${formatoPesos(propuesta.montoGastos)}`
        : "Gastos en pesos: No informados",
    ].join("\n");

    await navigator.clipboard.writeText(texto);
    actualizarEstado(propuesta.id, "Enviada");
    alert("Resumen copiado.");
  };

const obtenerEnlacePropuesta = (propuesta: Propuesta) => {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#propuesta=${encodeURIComponent(propuesta.id)}`;
};
  const copiarEnlacePropuesta = async (propuesta: Propuesta) => {
    try {
      const enlace = obtenerEnlacePropuesta(propuesta);
      await navigator.clipboard.writeText(enlace);
      actualizarEstado(propuesta.id, "Enviada");
      alert(
        "Enlace copiado. Mandátelo por WhatsApp y abrilo desde tu celular."
      );
    } catch {
      alert("No se pudo generar el enlace.");
    }
  };

  const compartirEnlacePropuesta = async (propuesta: Propuesta) => {
    try {
      const modelo =
        catalogo.find((item) => item.id === propuesta.modeloId) || catalogo[0];
      const enlace = obtenerEnlacePropuesta(propuesta);
      const mensaje = `Hola ${propuesta.cliente}, te comparto la propuesta del BYD ${modelo?.nombre}: ${enlace}`;

      if (navigator.share) {
        await navigator.share({
          title: `Propuesta ${propuesta.id}`,
          text: mensaje,
          url: enlace,
        });
      } else {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
          "_blank"
        );
      }

      actualizarEstado(propuesta.id, "Enviada");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") {
        alert("No se pudo compartir el enlace.");
      }
    }
  };

  const guardarModeloEditado = (cambios: Partial<ModeloVehiculo>) => {
    if (!modeloEditando) return;

    setCatalogo((actual) =>
      actual.map((modelo) =>
        modelo.id === modeloEditando.id ? { ...modelo, ...cambios } : modelo
      )
    );
  };

  const agregarColor = () => {
    if (!modeloEditando) return;

    const nuevoColor: ColorVehiculo = {
      id: crearId("color"),
      nombre: "Nuevo color",
      codigo: "#cccccc",
      imagen: FOTO_AUTO_ALTERNATIVA,
    };

    guardarModeloEditado({
      colores: [...modeloEditando.colores, nuevoColor],
    });
  };

  const actualizarColor = (
    colorIdEditar: string,
    cambios: Partial<ColorVehiculo>
  ) => {
    if (!modeloEditando) return;

    guardarModeloEditado({
      colores: modeloEditando.colores.map((color) =>
        color.id === colorIdEditar ? { ...color, ...cambios } : color
      ),
    });
  };

  const borrarColor = (colorIdBorrar: string) => {
    if (!modeloEditando) return;
    if (modeloEditando.colores.length === 1) {
      alert("El modelo debe conservar al menos un color.");
      return;
    }

    guardarModeloEditado({
      colores: modeloEditando.colores.filter(
        (color) => color.id !== colorIdBorrar
      ),
    });
  };

  const agregarCargador = () => {
    if (!modeloEditando) return;

    const nuevoCargador: Cargador = {
      id: crearId("cargador"),
      nombre: "Nuevo cargador",
      descripcion: "Descripción del cargador.",
      imagen: FOTO_CARGADOR_ALTERNATIVA,
      incluidoPorDefecto: true,
    };

    guardarModeloEditado({
      cargadores: [...modeloEditando.cargadores, nuevoCargador],
    });
  };

  const actualizarCargador = (
    cargadorId: string,
    cambios: Partial<Cargador>
  ) => {
    if (!modeloEditando) return;

    guardarModeloEditado({
      cargadores: modeloEditando.cargadores.map((cargador) =>
        cargador.id === cargadorId ? { ...cargador, ...cambios } : cargador
      ),
    });
  };

  const borrarCargador = (cargadorId: string) => {
    if (!modeloEditando) return;

    guardarModeloEditado({
      cargadores: modeloEditando.cargadores.filter(
        (cargador) => cargador.id !== cargadorId
      ),
    });
  };

  const agregarModelo = () => {
    const nuevoModelo: ModeloVehiculo = {
      id: crearId("modelo"),
      nombre: "NUEVO MODELO",
      tipo: "Tipo de vehículo",
      versiones: ["GS"],
      garantia: asesor.garantiaPredeterminada,
      descripcion: "Descripción del vehículo.",
      colores: [
        {
          id: crearId("color"),
          nombre: "Nuevo color",
          codigo: "#cccccc",
          imagen: FOTO_AUTO_ALTERNATIVA,
        },
      ],
      cargadores: [],
    };

    setCatalogo((actual) => [...actual, nuevoModelo]);
    setModeloEditandoId(nuevoModelo.id);
  };

  const borrarModelo = () => {
    if (!modeloEditando) return;
    if (catalogo.length === 1) {
      alert("Debe existir al menos un modelo.");
      return;
    }
    if (!window.confirm(`¿Eliminar ${modeloEditando.nombre}?`)) return;

    const nuevoCatalogo = catalogo.filter(
      (modelo) => modelo.id !== modeloEditando.id
    );
    setCatalogo(nuevoCatalogo);
    setModeloEditandoId(nuevoCatalogo[0].id);
  };

  const subirImagenColor = async (
    evento: ChangeEvent<HTMLInputElement>,
    colorIdEditar: string
  ) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const imagen = await leerArchivoComoDataURL(archivo);
    actualizarColor(colorIdEditar, { imagen });
  };

  const subirImagenCargador = async (
    evento: ChangeEvent<HTMLInputElement>,
    cargadorId: string
  ) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const imagen = await leerArchivoComoDataURL(archivo);
    actualizarCargador(cargadorId, { imagen });
  };

  const subirFotoAsesor = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const foto = await leerArchivoComoDataURL(archivo);
    setAsesor((actual) => ({ ...actual, foto }));
  };

  const subirLogo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const logo = await leerArchivoComoDataURL(archivo);
    setAsesor((actual) => ({ ...actual, logo }));
  };

  const mostrarMenu = pantalla !== "vistaCliente" && !esEnlacePublico;

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className={mostrarMenu ? "app" : "app app-cliente"}>
      {mostrarMenu && (
        <div
          className={`estado-nube estado-nube-${estadoNube}`}
          title="Estado de sincronización con Supabase"
        >
          <span />
          {estadoNube === "conectando" && "Sincronizando..."}
          {estadoNube === "sincronizado" && "Guardado en la nube"}
          {estadoNube === "offline" && "Sin conexión · respaldo local"}
          {estadoNube === "error" && "Error de sincronización"}
        </div>
      )}

      {mostrarMenu && (
  <Sidebar
    pantalla={pantalla}
    propuestas={propuestas}
    abrirNuevaPropuesta={abrirNuevaPropuesta}
    setPantalla={setPantalla}
    cerrarSesion={cerrarSesion}
  />
)}
<main className="content">
          {pantalla === "inicio" && (
  <Inicio
    propuestas={propuestas}
    catalogo={catalogo}
    abrirNuevaPropuesta={abrirNuevaPropuesta}
    abrirPropuesta={abrirPropuesta}
    asesor={asesor}
  />
)}

{pantalla === "propuestas" && (
  <ListaPropuestas
    propuestas={propuestas}
    catalogo={catalogo}
    abrirNuevaPropuesta={abrirNuevaPropuesta}
    abrirPropuesta={abrirPropuesta}
    eliminarPropuesta={eliminarPropuesta}
  />
)}

{pantalla === "catalogo" && (
  <EditorCatalogo
    catalogo={catalogo}
    modeloEditando={modeloEditando}
    modeloEditandoId={modeloEditandoId}
    setModeloEditandoId={setModeloEditandoId}
    guardarModeloEditado={guardarModeloEditado}
    agregarModelo={agregarModelo}
    borrarModelo={borrarModelo}
    agregarColor={agregarColor}
    actualizarColor={actualizarColor}
    borrarColor={borrarColor}
    subirImagenColor={subirImagenColor}
    agregarCargador={agregarCargador}
    actualizarCargador={actualizarCargador}
    borrarCargador={borrarCargador}
    subirImagenCargador={subirImagenCargador}
  />
)}
{pantalla === "configuracion" && (
  <Configuracion
    asesor={asesor}
    setAsesor={setAsesor}
    subirFotoAsesor={subirFotoAsesor}
    subirLogo={subirLogo}
  />
)}
        {pantalla === "nueva" && (
          <>
            <header className="encabezado">
              <div>
                <p className="eyebrow">Nueva cotización</p>
                <h1>Nueva propuesta</h1>
                <p>Completá la información paso a paso.</p>
              </div>

              <button
                className="boton-secundario"
                onClick={() => setPantalla("inicio")}
              >
                ← Salir
              </button>
            </header>

            <div className="pasos">
              {["Cliente", "Vehículo", "Condiciones", "Vista previa"].map(
                (nombre, indice) => (
                  <button
                    type="button"
                    key={nombre}
                    className={
                      paso === indice + 1
                        ? "paso paso-seleccionado"
                        : paso > indice + 1
                        ? "paso paso-completo"
                        : "paso"
                    }
                    onClick={() => {
                      if (indice + 1 <= paso) setPaso(indice + 1);
                    }}
                  >
                    <span>{indice + 1}</span>
                    {nombre}
                  </button>
                )
              )}
            </div>

            <section className="form-card">
              {paso === 1 && (
                <>
                  <TituloFormulario
                    icono="👤"
                    titulo="Datos del cliente"
                    descripcion="Información de la persona que recibirá la propuesta."
                  />

                  <div className="grilla-formulario">
                    <Campo
                      etiqueta="Nombre y apellido"
                      valor={cliente}
                      cambiar={setCliente}
                      placeholder="Ejemplo: Juan Pérez"
                    />

                    <Campo
                      etiqueta="Teléfono"
                      valor={telefono}
                      cambiar={setTelefono}
                      placeholder="Ejemplo: 11 1234 5678"
                      tipo="tel"
                    />

                    <Campo
                      etiqueta="Correo electrónico"
                      valor={email}
                      cambiar={setEmail}
                      placeholder="cliente@email.com"
                      tipo="email"
                    />
                  </div>

                  <div className="acciones-formulario derecha">
                    <button
                      className="boton-verde"
                      onClick={() => {
                        if (!cliente.trim() || !telefono.trim()) {
                          alert("Completá nombre y teléfono.");
                          return;
                        }
                        setPaso(2);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Continuar →
                    </button>
                  </div>
                </>
              )}

              {paso === 2 && modeloSeleccionado && colorSeleccionado && (
                <>
                  <TituloFormulario
                    icono="🚘"
                    titulo="Elegí el vehículo"
                    descripcion="La foto cambia automáticamente con el color."
                  />

                  <div className="selector-modelos">
                    {catalogo.map((modelo) => (
                      <button
                        type="button"
                        key={modelo.id}
                        className={
                          modelo.id === modeloId
                            ? "modelo-opcion seleccionado"
                            : "modelo-opcion"
                        }
                        onClick={() => seleccionarModelo(modelo.id)}
                      >
                        <strong>{modelo.nombre}</strong>
                        <small>{modelo.tipo}</small>
                      </button>
                    ))}
                  </div>

                  <div className="vehiculo-elegido">
                    <div className="vehiculo-foto">
                      <img
                        src={colorSeleccionado.imagen}
                        alt={`${modeloSeleccionado.nombre} ${colorSeleccionado.nombre}`}
                        onError={(evento) => {
                          evento.currentTarget.src = FOTO_AUTO_ALTERNATIVA;
                        }}
                      />
                    </div>

                    <div className="vehiculo-datos">
                      <span>BYD</span>
                      <h2>{modeloSeleccionado.nombre}</h2>
                      <p>{modeloSeleccionado.tipo}</p>

                      <label>Versión</label>
                      <select
                        value={version}
                        onChange={(evento) => setVersion(evento.target.value)}
                      >
                        {modeloSeleccionado.versiones.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>

                      <label>Color exterior</label>
                      <div className="selector-colores">
                        {modeloSeleccionado.colores.map((color) => (
                          <button
                            type="button"
                            key={color.id}
                            className={
                              color.id === colorId
                                ? "color-circulo color-seleccionado"
                                : "color-circulo"
                            }
                            style={{ backgroundColor: color.codigo }}
                            title={color.nombre}
                            onClick={() => setColorId(color.id)}
                          />
                        ))}
                      </div>

                      <strong className="nombre-color">
                        {colorSeleccionado.nombre}
                      </strong>
                    </div>
                  </div>

                  <div className="acciones-formulario">
                    <button
                      className="boton-secundario"
                      onClick={() => setPaso(1)}
                    >
                      ← Volver
                    </button>
                    <button
                      className="boton-verde"
                      onClick={() => {
                        setPaso(3);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Continuar →
                    </button>
                  </div>
                </>
              )}

              {paso === 3 && modeloSeleccionado && (
                <>
                  <TituloFormulario
                    icono="💰"
                    titulo="Condiciones comerciales"
                    descripcion="Elegí contado o crédito. El cliente verá solamente la opción elegida."
                  />

                  <h3 className="subtitulo-formulario">Forma de compra</h3>

                  <div className="selector-forma-compra">
                    <button
                      type="button"
                      className={
                        formaCompra === "contado"
                          ? "forma-compra activa"
                          : "forma-compra"
                      }
                      onClick={() => setFormaCompra("contado")}
                    >
                      <span>💵</span>
                      <strong>Contado</strong>
                      <small>Pago total de la unidad.</small>
                    </button>

                    <button
                      type="button"
                      className={
                        formaCompra === "credito"
                          ? "forma-compra activa"
                          : "forma-compra"
                      }
                      onClick={() => setFormaCompra("credito")}
                    >
                      <span>🏦</span>
                      <strong>Crédito</strong>
                      <small>Anticipo más cuotas.</small>
                    </button>
                  </div>

                  <h3 className="subtitulo-formulario">Valores</h3>

                  <div className="grilla-formulario">
                    <CampoNumero
                      etiqueta="Precio de lista"
                      valor={precioLista}
                      cambiar={setPrecioLista}
                    />
                    <CampoNumero
                      etiqueta="Bonificación especial"
                      valor={bonificacion}
                      cambiar={setBonificacion}
                    />

                    {formaCompra === "credito" && (
                      <>
                        <CampoNumero
                          etiqueta="Anticipo"
                          valor={anticipo}
                          cambiar={setAnticipo}
                        />
                        <CampoNumero
                          etiqueta="Cantidad de cuotas"
                          valor={cuotas}
                          cambiar={setCuotas}
                        />
                        <CampoNumero
                          etiqueta="Valor de cuota"
                          valor={valorCuota}
                          cambiar={setValorCuota}
                        />
                      </>
                    )}
                  </div>

                  <h3 className="subtitulo-formulario">
                    Gastos de la operación
                  </h3>

                  <div className="selector-gastos">
                    <button
                      type="button"
                      className={
                        tipoGasto === "sin-gastos"
                          ? "gasto-opcion activo"
                          : "gasto-opcion"
                      }
                      onClick={() => {
                        setTipoGasto("sin-gastos");
                        setMontoGastos(0);
                      }}
                    >
                      <strong>Sin gastos informados</strong>
                      <small>No se agregan gastos al total.</small>
                    </button>

                    <button
                      type="button"
                      className={
                        tipoGasto === "flete-formulario"
                          ? "gasto-opcion activo"
                          : "gasto-opcion"
                      }
                      onClick={() => setTipoGasto("flete-formulario")}
                    >
                      <strong>Flete y formulario</strong>
                      <small>Cargá el monto correspondiente.</small>
                    </button>

                    <button
                      type="button"
                      className={
                        tipoGasto === "patentamiento-completo"
                          ? "gasto-opcion activo"
                          : "gasto-opcion"
                      }
                      onClick={() => setTipoGasto("patentamiento-completo")}
                    >
                      <strong>Patentamiento completo</strong>
                      <small>Incluye el total de puesta en calle.</small>
                    </button>
                  </div>

                  {tipoGasto !== "sin-gastos" && (
                    <div className="grilla-formulario margen-superior">
                      <CampoNumero
                        etiqueta={
                          tipoGasto === "flete-formulario"
                            ? "Monto de flete y formulario"
                            : "Monto de patentamiento completo"
                        }
                        valor={montoGastos}
                        cambiar={setMontoGastos}
                      />
                    </div>
                  )}

                  <div className="resumen-valores">
                    <div>
                      <span>Precio final del vehículo</span>
                      <strong>{formatoUSD(precioFinal)}</strong>
                    </div>

                    <div>
                      <span>Gastos en pesos</span>
                      <strong>
                        {tipoGasto === "sin-gastos"
                          ? "No informados"
                          : formatoPesos(montoGastos)}
                      </strong>
                    </div>

                    {formaCompra === "credito" && (
                      <div>
                        <span>Capital estimado a financiar</span>
                        <strong>{formatoUSD(saldoCredito)}</strong>
                      </div>
                    )}
                  </div>

                  {formaCompra === "credito" && (
                    <div className="campo-completo">
                      <label>Aclaración del crédito</label>
                      <textarea
                        value={aclaracionCredito}
                        onChange={(evento) =>
                          setAclaracionCredito(evento.target.value)
                        }
                      />
                    </div>
                  )}

                  <h3 className="subtitulo-formulario">Cargadores incluidos</h3>

                  {modeloSeleccionado.cargadores.length === 0 ? (
                    <p className="texto-ayuda">
                      Este modelo no tiene cargadores configurados. Podés
                      agregarlos desde Catálogo editable.
                    </p>
                  ) : (
                    <div className="selector-cargadores">
                      {modeloSeleccionado.cargadores.map((cargador) => {
                        const activo = cargadoresIncluidos.includes(
                          cargador.id
                        );

                        return (
                          <button
                            type="button"
                            key={cargador.id}
                            className={
                              activo
                                ? "cargador-selector activo"
                                : "cargador-selector"
                            }
                            onClick={() =>
                              setCargadoresIncluidos((actuales) =>
                                activo
                                  ? actuales.filter((id) => id !== cargador.id)
                                  : [...actuales, cargador.id]
                              )
                            }
                          >
                            <img
                              src={cargador.imagen}
                              alt={cargador.nombre}
                              onError={(evento) => {
                                evento.currentTarget.src =
                                  FOTO_CARGADOR_ALTERNATIVA;
                              }}
                            />
                            <div>
                              <strong>{cargador.nombre}</strong>
                              <small>{cargador.descripcion}</small>
                            </div>
                            <span>{activo ? "✓ Incluido" : "Agregar"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <h3 className="subtitulo-formulario">Accesorios rápidos</h3>

                  <div className="interruptores">
                    <Interruptor
                      etiqueta="Polarizado"
                      activo={accesorios.polarizado}
                      cambiar={(activo) =>
                        setAccesorios((actual) => ({
                          ...actual,
                          polarizado: activo,
                        }))
                      }
                    />
                    <Interruptor
                      etiqueta="Tuercas de seguridad"
                      activo={accesorios.tuercas}
                      cambiar={(activo) =>
                        setAccesorios((actual) => ({
                          ...actual,
                          tuercas: activo,
                        }))
                      }
                    />
                    <Interruptor
                      etiqueta="Alfombras"
                      activo={accesorios.alfombras}
                      cambiar={(activo) =>
                        setAccesorios((actual) => ({
                          ...actual,
                          alfombras: activo,
                        }))
                      }
                    />
                    <Interruptor
                      etiqueta="Patentamiento incluido"
                      activo={accesorios.patentamiento}
                      cambiar={(activo) =>
                        setAccesorios((actual) => ({
                          ...actual,
                          patentamiento: activo,
                        }))
                      }
                    />
                  </div>

                  <div className="grilla-formulario margen-superior">
                    <CampoNumero
                      etiqueta="Vigencia en días"
                      valor={vigenciaDias}
                      cambiar={setVigenciaDias}
                    />
                  </div>

                  <div className="campo-completo">
                    <label>Observaciones</label>
                    <textarea
                      value={observaciones}
                      onChange={(evento) =>
                        setObservaciones(evento.target.value)
                      }
                      placeholder="Entrega sujeta a disponibilidad de stock."
                    />
                  </div>

                  <div className="acciones-formulario">
                    <button
                      className="boton-secundario"
                      onClick={() => setPaso(2)}
                    >
                      ← Volver
                    </button>

                    <button
                      className="boton-verde"
                      onClick={() => {
                        if (precioLista <= 0) {
                          alert("Ingresá un precio válido.");
                          return;
                        }
                        setPaso(4);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Ver propuesta →
                    </button>
                  </div>
                </>
              )}

              {paso === 4 && modeloSeleccionado && colorSeleccionado && (
                <>
                  <TituloFormulario
                    icono="✨"
                    titulo="Vista previa"
                    descripcion="Revisá la propuesta antes de guardarla."
                  />

                  <MiniVistaPrevia
                    cliente={cliente}
                    modelo={modeloSeleccionado}
                    color={colorSeleccionado}
                    formaCompra={formaCompra}
                    precioLista={precioLista}
                    bonificacion={bonificacion}
                    tipoGasto={tipoGasto}
                    montoGastos={montoGastos}
                    anticipo={anticipo}
                    cuotas={cuotas}
                    valorCuota={valorCuota}
                  />

                  <div className="acciones-formulario">
                    <button
                      className="boton-secundario"
                      onClick={() => setPaso(3)}
                    >
                      ← Modificar
                    </button>
                    <button
                      className="boton-verde boton-grande"
                      onClick={guardarYVer}
                    >
                      Guardar y abrir propuesta
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {pantalla === "vistaCliente" && propuestaAbierta && (
      <VistaComercial
        propuesta={propuestaAbierta}
        asesor={asesor}
        catalogo={catalogo}
        modeloGuardado={modeloPropuestaAbierta}
        volver={() => setPantalla("propuestas")}
        abrirWhatsApp={abrirWhatsApp}
        copiarResumen={copiarResumen}
        copiarEnlace={copiarEnlacePropuesta}
        compartirEnlace={compartirEnlacePropuesta}
        esEnlacePublico={esEnlacePublico}
      />       
       )}
      </main>
    </div>
  );
}

function Inicio({
  propuestas,
  catalogo,
  abrirNuevaPropuesta,
  abrirPropuesta,
  asesor,
}: {
  propuestas: Propuesta[];
  catalogo: ModeloVehiculo[];
  abrirNuevaPropuesta: () => void;
  abrirPropuesta: (propuesta: Propuesta) => void;
  asesor: Asesor;
}) {
  const enviadas = propuestas.filter((p) => p.estado === "Enviada").length;
  const interesados = propuestas.filter(
    (p) => p.estado === "Interesado"
  ).length;

  return (
    <>
      <header className="encabezado">
        <div>
          <p className="eyebrow">Panel principal</p>
          <h1>
  Hola {(asesor.nombre || "Asesor").split(" ")[0]} 👋
</h1>
          <p>Creá propuestas profesionales y gestioná tus clientes.</p>
        </div>
        <button className="boton-verde" onClick={abrirNuevaPropuesta}>
          ＋ Nueva propuesta
        </button>
      </header>

      <section className="metricas">
        <article className="metrica">
          <span>▤</span>
          <p>Propuestas guardadas</p>
          <h2>{propuestas.length}</h2>
          <small>En este navegador</small>
        </article>
        <article className="metrica">
          <span>➤</span>
          <p>Propuestas enviadas</p>
          <h2>{enviadas}</h2>
          <small>Con resumen compartido</small>
        </article>
        <article className="metrica">
          <span>✓</span>
          <p>Clientes interesados</p>
          <h2>{interesados}</h2>
          <small>Acciones por WhatsApp</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-titulo">
          <h2>Actividad reciente</h2>
          <p>Últimas propuestas creadas.</p>
        </div>

        {propuestas.length === 0 ? (
          <div className="estado-vacio">
            <span>🚘</span>
            <h3>Todavía no creaste propuestas</h3>
            <p>La primera quedará guardada automáticamente.</p>
            <button className="boton-verde" onClick={abrirNuevaPropuesta}>
              Crear primera propuesta
            </button>
          </div>
        ) : (
          propuestas.slice(0, 4).map((propuesta) => {
            const modelo = catalogo.find(
              (item) => item.id === propuesta.modeloId
            );

            return (
              <div className="fila-reciente" key={propuesta.id}>
                <div className="avatar">
                  {propuesta.cliente
                    .split(" ")
                    .slice(0, 2)
                    .map((parte) => parte[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <strong>{propuesta.cliente}</strong>
                  <p>BYD {modelo?.nombre}</p>
                </div>
                <span
                  className={`estado estado-${propuesta.estado.toLowerCase()}`}
                >
                  {propuesta.estado}
                </span>
                <button
                  className="boton-ver"
                  onClick={() => abrirPropuesta(propuesta)}
                >
                  Ver
                </button>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

function ListaPropuestas({
  propuestas,
  catalogo,
  abrirNuevaPropuesta,
  abrirPropuesta,
  eliminarPropuesta,
}: {
  propuestas: Propuesta[];
  catalogo: ModeloVehiculo[];
  abrirNuevaPropuesta: () => void;
  abrirPropuesta: (propuesta: Propuesta) => void;
  eliminarPropuesta: (id: string) => void;
}) {
  return (
    <>
      <header className="encabezado">
        <div>
          <p className="eyebrow">Historial comercial</p>
          <h1>Mis propuestas</h1>
          <p>Abrí, revisá o eliminá las propuestas guardadas.</p>
        </div>
        <button className="boton-verde" onClick={abrirNuevaPropuesta}>
          ＋ Nueva propuesta
        </button>
      </header>

      <section className="panel">
        {propuestas.length === 0 ? (
          <div className="estado-vacio">
            <span>▤</span>
            <h3>No hay propuestas guardadas</h3>
            <p>Cuando generes una propuesta aparecerá acá.</p>
            <button className="boton-verde" onClick={abrirNuevaPropuesta}>
              Crear propuesta
            </button>
          </div>
        ) : (
          propuestas.map((propuesta) => {
            const modelo = catalogo.find(
              (item) => item.id === propuesta.modeloId
            );
            const precioFinal = propuesta.precioLista - propuesta.bonificacion;

            return (
              <div className="fila-propuesta-completa" key={propuesta.id}>
                <div className="cliente-propuesta">
                  <div className="avatar">
                    {propuesta.cliente
                      .split(" ")
                      .slice(0, 2)
                      .map((parte) => parte[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <strong>{propuesta.cliente}</strong>
                    <p>
                      BYD {modelo?.nombre} ·{" "}
                      {propuesta.formaCompra === "contado"
                        ? "Contado"
                        : "Crédito"}
                    </p>
                    <small>{propuesta.id}</small>
                  </div>
                </div>

                <div>
                  <strong>{formatoUSD(precioFinal)}</strong>
                  <p>{new Date(propuesta.fecha).toLocaleDateString("es-AR")}</p>
                </div>

                <span
                  className={`estado estado-${propuesta.estado.toLowerCase()}`}
                >
                  {propuesta.estado}
                </span>

                <div className="acciones-lista">
                  <button
                    className="boton-ver"
                    onClick={() => abrirPropuesta(propuesta)}
                  >
                    Ver propuesta
                  </button>
                  <button
                    className="boton-eliminar"
                    onClick={() => eliminarPropuesta(propuesta.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

function EditorCatalogo({
  catalogo,
  modeloEditando,
  modeloEditandoId,
  setModeloEditandoId,
  guardarModeloEditado,
  agregarModelo,
  borrarModelo,
  agregarColor,
  actualizarColor,
  borrarColor,
  subirImagenColor,
  agregarCargador,
  actualizarCargador,
  borrarCargador,
  subirImagenCargador,
}: {
  catalogo: ModeloVehiculo[];
  modeloEditando?: ModeloVehiculo;
  modeloEditandoId: string;
  setModeloEditandoId: (id: string) => void;
  guardarModeloEditado: (cambios: Partial<ModeloVehiculo>) => void;
  agregarModelo: () => void;
  borrarModelo: () => void;
  agregarColor: () => void;
  actualizarColor: (colorId: string, cambios: Partial<ColorVehiculo>) => void;
  borrarColor: (colorId: string) => void;
  subirImagenColor: (
    evento: ChangeEvent<HTMLInputElement>,
    colorId: string
  ) => void;
  agregarCargador: () => void;
  actualizarCargador: (cargadorId: string, cambios: Partial<Cargador>) => void;
  borrarCargador: (cargadorId: string) => void;
  subirImagenCargador: (
    evento: ChangeEvent<HTMLInputElement>,
    cargadorId: string
  ) => void;
}) {
  if (!modeloEditando) return null;

  return (
    <>
      <header className="encabezado">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Catálogo editable</h1>
          <p>Editá modelos, colores, fotos y cargadores.</p>
        </div>
        <button className="boton-verde" onClick={agregarModelo}>
          ＋ Agregar modelo
        </button>
      </header>

      <section className="editor-catalogo">
        <aside className="lista-modelos-editor">
          {catalogo.map((modelo) => (
            <button
              key={modelo.id}
              className={modelo.id === modeloEditandoId ? "activo" : ""}
              onClick={() => setModeloEditandoId(modelo.id)}
            >
              <strong>{modelo.nombre}</strong>
              <small>{modelo.tipo}</small>
            </button>
          ))}
        </aside>

        <div className="panel-editor">
          <div className="encabezado-editor">
            <div>
              <h2>{modeloEditando.nombre}</h2>
              <p>Los cambios se guardan automáticamente.</p>
            </div>
            <button className="boton-eliminar" onClick={borrarModelo}>
              Eliminar modelo
            </button>
          </div>

          <div className="grilla-formulario">
            <Campo
              etiqueta="Nombre del modelo"
              valor={modeloEditando.nombre}
              cambiar={(nombre) => guardarModeloEditado({ nombre })}
            />
            <Campo
              etiqueta="Tipo"
              valor={modeloEditando.tipo}
              cambiar={(tipo) => guardarModeloEditado({ tipo })}
            />
            <Campo
              etiqueta="Versiones separadas por coma"
              valor={modeloEditando.versiones.join(", ")}
              cambiar={(valor) =>
                guardarModeloEditado({
                  versiones: valor
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
            <Campo
              etiqueta="Garantía"
              valor={modeloEditando.garantia}
              cambiar={(garantia) => guardarModeloEditado({ garantia })}
            />
          </div>

          <div className="campo-completo">
            <label>Descripción</label>
            <textarea
              value={modeloEditando.descripcion}
              onChange={(evento) =>
                guardarModeloEditado({
                  descripcion: evento.target.value,
                })
              }
            />
          </div>

          <div className="titulo-editor-seccion">
            <div>
              <h3>Colores e imágenes</h3>
              <p>Podés cambiar nombres, tonos y subir una foto por color.</p>
            </div>
            <button className="boton-secundario" onClick={agregarColor}>
              ＋ Agregar color
            </button>
          </div>

          <div className="lista-colores-editor">
            {modeloEditando.colores.map((color) => (
              <article className="color-editor" key={color.id}>
                <img
                  src={color.imagen}
                  alt={color.nombre}
                  onError={(evento) => {
                    evento.currentTarget.src = FOTO_AUTO_ALTERNATIVA;
                  }}
                />

                <div className="color-editor-campos">
                  <Campo
                    etiqueta="Nombre"
                    valor={color.nombre}
                    cambiar={(nombre) => actualizarColor(color.id, { nombre })}
                  />

                  <label className="campo-color">
                    Color visual
                    <input
                      type="color"
                      value={color.codigo}
                      onChange={(evento) =>
                        actualizarColor(color.id, {
                          codigo: evento.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="boton-subir">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(evento) => subirImagenColor(evento, color.id)}
                    />
                  </label>

                  <button
                    className="boton-eliminar"
                    onClick={() => borrarColor(color.id)}
                  >
                    Borrar color
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="titulo-editor-seccion">
            <div>
              <h3>Cargadores</h3>
              <p>Se muestran con imagen en la propuesta.</p>
            </div>
            <button className="boton-secundario" onClick={agregarCargador}>
              ＋ Agregar cargador
            </button>
          </div>

          <div className="lista-cargadores-editor">
            {modeloEditando.cargadores.length === 0 && (
              <p className="texto-ayuda">
                Todavía no hay cargadores configurados.
              </p>
            )}

            {modeloEditando.cargadores.map((cargador) => (
              <article className="cargador-editor" key={cargador.id}>
                <img
                  src={cargador.imagen}
                  alt={cargador.nombre}
                  onError={(evento) => {
                    evento.currentTarget.src = FOTO_CARGADOR_ALTERNATIVA;
                  }}
                />

                <div className="cargador-editor-campos">
                  <Campo
                    etiqueta="Nombre"
                    valor={cargador.nombre}
                    cambiar={(nombre) =>
                      actualizarCargador(cargador.id, { nombre })
                    }
                  />

                  <Campo
                    etiqueta="Descripción"
                    valor={cargador.descripcion}
                    cambiar={(descripcion) =>
                      actualizarCargador(cargador.id, {
                        descripcion,
                      })
                    }
                  />

                  <label className="check-editor">
                    <input
                      type="checkbox"
                      checked={cargador.incluidoPorDefecto}
                      onChange={(evento) =>
                        actualizarCargador(cargador.id, {
                          incluidoPorDefecto: evento.target.checked,
                        })
                      }
                    />
                    Incluido por defecto
                  </label>

                  <label className="boton-subir">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(evento) =>
                        subirImagenCargador(evento, cargador.id)
                      }
                    />
                  </label>

                  <button
                    className="boton-eliminar"
                    onClick={() => borrarCargador(cargador.id)}
                  >
                    Borrar cargador
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Configuracion({
  asesor,
  setAsesor,
  subirFotoAsesor,
  subirLogo,
}: {
  asesor: Asesor;
  setAsesor: React.Dispatch<React.SetStateAction<Asesor>>;
  subirFotoAsesor: (evento: ChangeEvent<HTMLInputElement>) => void;
  subirLogo: (evento: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <header className="encabezado">
        <div>
          <p className="eyebrow">Datos generales</p>
          <h1>Configuración</h1>
          <p>Estos datos aparecen en todas las propuestas.</p>
        </div>
      </header>

      <section className="form-card">
        <TituloFormulario
          icono="👤"
          titulo="Perfil comercial"
          descripcion="Los cambios se guardan automáticamente."
        />

        <div className="grilla-formulario">
          <Campo
            etiqueta="Nombre y apellido"
            valor={asesor.nombre}
            cambiar={(nombre) => setAsesor((actual) => ({ ...actual, nombre }))}
          />
          <Campo
            etiqueta="Cargo"
            valor={asesor.cargo}
            cambiar={(cargo) => setAsesor((actual) => ({ ...actual, cargo }))}
          />
          <Campo
            etiqueta="WhatsApp con código de país"
            valor={asesor.telefono}
            cambiar={(telefono) =>
              setAsesor((actual) => ({ ...actual, telefono }))
            }
          />
          <Campo
            etiqueta="Correo electrónico"
            valor={asesor.email}
            cambiar={(email) => setAsesor((actual) => ({ ...actual, email }))}
            tipo="email"
          />
          <Campo
            etiqueta="Nombre del concesionario"
            valor={asesor.concesionario}
            cambiar={(concesionario) =>
              setAsesor((actual) => ({
                ...actual,
                concesionario,
              }))
            }
          />
          <Campo
            etiqueta="Texto de entrega"
            valor={asesor.textoEntrega}
            cambiar={(textoEntrega) =>
              setAsesor((actual) => ({
                ...actual,
                textoEntrega,
              }))
            }
          />
          <Campo
            etiqueta="Garantía predeterminada"
            valor={asesor.garantiaPredeterminada}
            cambiar={(garantiaPredeterminada) =>
              setAsesor((actual) => ({
                ...actual,
                garantiaPredeterminada,
              }))
            }
          />
          <CampoNumero
            etiqueta="Vigencia predeterminada"
            valor={asesor.vigenciaPredeterminada}
            cambiar={(vigenciaPredeterminada) =>
              setAsesor((actual) => ({
                ...actual,
                vigenciaPredeterminada,
              }))
            }
          />
        </div>

        <div className="subidas-configuracion">
          <div>
            <h3>Foto del asesor</h3>
            <img src={asesor.foto} alt={asesor.nombre} />
            <label className="boton-subir">
              Cambiar foto
              <input type="file" accept="image/*" onChange={subirFotoAsesor} />
            </label>
          </div>

          <div>
            <h3>Logo del concesionario</h3>
            <div className="logo-configuracion">
              {asesor.logo ? (
                <img src={asesor.logo} alt="Logo" />
              ) : (
                <span>Sin logo cargado</span>
              )}
            </div>
            <label className="boton-subir">
              Cambiar logo
              <input type="file" accept="image/*" onChange={subirLogo} />
            </label>
          </div>
        </div>

        <div className="mensaje-guardado">
          ✓ Configuración guardada en este navegador
        </div>
      </section>
    </>
  );
}

function VistaComercial({
  propuesta,
  asesor,
  catalogo,
   modeloGuardado,
  volver,
  abrirWhatsApp,
  copiarResumen,
  copiarEnlace,
  compartirEnlace,
  esEnlacePublico,
}: {
  propuesta: Propuesta;
  asesor: Asesor;
  catalogo: ModeloVehiculo[];
  modeloGuardado: ModeloVehiculo | null;
  volver: () => void;
  abrirWhatsApp: (
    propuesta: Propuesta,
    accion: "consulta" | "reserva" | "testdrive"
  ) => void;
  copiarResumen: (propuesta: Propuesta) => void;
  copiarEnlace: (propuesta: Propuesta) => void;
  compartirEnlace: (propuesta: Propuesta) => void;
  esEnlacePublico: boolean;
}) {
const modelo =
  modeloGuardado ||
  catalogo.find((item) => item.id === propuesta.modeloId);
  
  if (!modelo) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>No se encontró el vehículo</h2>
        <p>Esta propuesta fue creada con un modelo que ya no existe.</p>
      </div>
    );
  }

  const color =
    modelo.colores.find((item) => item.id === propuesta.colorId) ||
    modelo.colores[0];
      const precioFinal = Math.max(
    propuesta.precioLista - propuesta.bonificacion,
    0
  );

  const cargadores = modelo.cargadores.filter((cargador) =>
    propuesta.cargadoresIncluidos.includes(cargador.id)
  );

  const accesorios = [
    propuesta.accesorios.polarizado && {
      nombre: "Polarizado",
      icono: "▱",
    },
    propuesta.accesorios.tuercas && {
      nombre: "Tuercas de seguridad",
      icono: "⬡",
    },
    propuesta.accesorios.alfombras && {
      nombre: "Alfombras",
      icono: "▦",
    },
  ].filter(Boolean) as { nombre: string; icono: string }[];

  const gastoTexto =
    propuesta.tipoGasto === "flete-formulario"
      ? "Flete y formulario"
      : propuesta.tipoGasto === "patentamiento-completo"
      ? "Patentamiento completo"
      : "";

  return (
    <div className="aqv8-page">
      <header className="aqv8-topbar">
        <div className="aqv8-brand">
          {asesor.logo ? (
            <img src={asesor.logo} alt={asesor.concesionario} />
          ) : (
            <strong>BYD</strong>
          )}
        </div>

        <div className="aqv8-top-actions">
          {!esEnlacePublico && (
            <>
              <button onClick={volver}>← Volver</button>
              <button onClick={() => copiarEnlace(propuesta)}>
                🔗 Copiar enlace
              </button>
              <button onClick={() => compartirEnlace(propuesta)}>
                📲 Compartir
              </button>
            </>
          )}
          <button onClick={() => window.print()}>🖨 Imprimir / PDF</button>
        </div>
      </header>

      <main className="aqv8-content">
        <section className="aqv8-hero">
          <div className="aqv8-intro">
            <div>
              <span className="aqv8-kicker">PROPUESTA PERSONALIZADA</span>
              <h1>
                Hola, {propuesta.cliente.split(" ")[0]} <span>👋</span>
              </h1>
              <p>
                Gracias por tu interés en BYD. Preparamos esta propuesta
                especialmente para vos.
              </p>
            </div>

            <div className="aqv8-model">
              <h2>{modelo.nombre}</h2>
              <p>{modelo.tipo}</p>
              <strong>Versión {propuesta.version}</strong>
            </div>
          </div>

          <div className="aqv8-car-frame">
            <img
              src={color.imagen}
              alt={`${modelo.nombre} ${color.nombre}`}
              onError={(evento) => {
                evento.currentTarget.src = FOTO_AUTO_ALTERNATIVA;
              }}
            />
          </div>

          <div className="aqv8-color-row">
            <div>
              <span>Color seleccionado</span>
              <strong>{color.nombre}</strong>
            </div>

            <div className="aqv8-swatches">
              {modelo.colores.map((opcion) => (
                <i
                  key={opcion.id}
                  className={opcion.id === color.id ? "activo" : ""}
                  style={{ backgroundColor: opcion.codigo }}
                  title={opcion.nombre}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="aqv8-price-card">
          <h2>Resumen de precios</h2>

          <div className="aqv8-price-line">
            <span>Precio de lista</span>
            <strong>{formatoUSD(propuesta.precioLista)}</strong>
          </div>

          {propuesta.bonificacion > 0 && (
            <div className="aqv8-price-line aqv8-discount">
              <span>Bonificación especial</span>
              <strong>- {formatoUSD(propuesta.bonificacion)}</strong>
            </div>
          )}

          <div className="aqv8-price-final">
            <span>Precio final del vehículo</span>
            <strong>{formatoUSD(precioFinal)}</strong>
          </div>

          {gastoTexto && propuesta.montoGastos > 0 && (
            <div className="aqv8-price-line aqv8-expense">
              <span>{gastoTexto}</span>
              <strong>{formatoPesos(propuesta.montoGastos)}</strong>
            </div>
          )}

          <div className="aqv8-currency-summary">
            <div>
              <span>Unidad</span>
              <strong>{formatoUSD(precioFinal)}</strong>
            </div>
            <div>
              <span>{gastoTexto || "Gastos en pesos"}</span>
              <strong>
                {propuesta.montoGastos > 0
                  ? formatoPesos(propuesta.montoGastos)
                  : "No informados"}
              </strong>
            </div>
            <small>
              Los importes se muestran separados porque corresponden a monedas
              diferentes.
            </small>
          </div>
        </section>

        <section className="aqv8-benefits">
          <article>
            <b>✓</b>
            <div>
              <strong>Garantía oficial</strong>
              <span>{modelo.garantia}</span>
            </div>
          </article>

          <article>
            <b>▣</b>
            <div>
              <strong>Entrega estimada</strong>
              <span>{asesor.textoEntrega}</span>
            </div>
          </article>

          <article>
            <b>▤</b>
            <div>
              <strong>Patentamiento</strong>
              <span>
                {propuesta.accesorios.patentamiento
                  ? "Incluido"
                  : propuesta.tipoGasto === "patentamiento-completo"
                  ? "Presupuestado"
                  : "A convenir"}
              </span>
            </div>
          </article>
        </section>

        <section className="aqv8-section">
          <div className="aqv8-section-title">
            <span>CONDICIONES COMERCIALES</span>
            <h2>Forma de compra</h2>
          </div>

          {propuesta.formaCompra === "contado" ? (
            <article className="aqv8-purchase">
              <div className="aqv8-purchase-icon">💵</div>
              <div>
                <span>Contado</span>
                <h3>{formatoUSD(precioFinal)}</h3>
                <p>
                  Precio de la unidad. Los gastos en pesos se muestran por
                  separado.
                </p>
              </div>
              <em>✓ Seleccionada</em>
            </article>
          ) : (
            <article className="aqv8-purchase">
              <div className="aqv8-purchase-icon">🏦</div>
              <div>
                <span>Crédito</span>
                <h3>Anticipo {formatoUSD(propuesta.anticipo)}</h3>
                <p>
                  {propuesta.cuotas} cuotas estimadas de{" "}
                  <strong>{formatoPesos(propuesta.valorCuota)}</strong>
                </p>
                {propuesta.aclaracionCredito && (
                  <small>{propuesta.aclaracionCredito}</small>
                )}
              </div>
              <em>✓ Seleccionada</em>
            </article>
          )}
        </section>

        {cargadores.length > 0 && (
          <section className="aqv8-section">
            <div className="aqv8-section-title">
              <span>EQUIPAMIENTO DE CARGA</span>
              <h2>Cargadores incluidos</h2>
            </div>

            <div className="aqv8-chargers">
              {cargadores.map((cargador) => (
                <article key={cargador.id}>
                  <img
                    src={cargador.imagen}
                    alt={cargador.nombre}
                    onError={(evento) => {
                      evento.currentTarget.src = FOTO_CARGADOR_ALTERNATIVA;
                    }}
                  />
                  <div>
                    <strong>{cargador.nombre}</strong>
                    <p>{cargador.descripcion}</p>
                    <span>✓ Incluido</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {accesorios.length > 0 && (
          <section className="aqv8-section">
            <div className="aqv8-section-title">
              <span>BENEFICIOS ADICIONALES</span>
              <h2>Accesorios incluidos</h2>
            </div>

            <div className="aqv8-accessories">
              {accesorios.map((accesorio) => (
                <article key={accesorio.nombre}>
                  <b>{accesorio.icono}</b>
                  <strong>{accesorio.nombre}</strong>
                </article>
              ))}
            </div>
          </section>
        )}

        {propuesta.observaciones && (
          <section className="aqv8-note">
            <strong>Información importante</strong>
            <p>{propuesta.observaciones}</p>
          </section>
        )}

        <section className="aqv8-advisor">
          <div className="aqv8-advisor-profile">
            <img src={asesor.foto} alt={asesor.nombre} />
            <div>
            <span>Tu asesor comercial</span>
            <h2>{asesor.nombre}</h2>
            <p>{asesor.cargo}</p>
            <small>● En línea · Atención personalizada</small>
            </div>
          </div>

          <div className="aqv8-advisor-actions">
            <button
              className="aqv8-whatsapp"
              onClick={() => abrirWhatsApp(propuesta, "consulta")}
            >
              WhatsApp
            </button>
            <a href={`tel:+${asesor.telefono}`}>Llamar</a>
            <button onClick={() => copiarResumen(propuesta)}>
              Copiar resumen
            </button>
          </div>
        </section>

        <section className="aqv8-cta">
          <button onClick={() => abrirWhatsApp(propuesta, "reserva")}>
            Quiero reservar esta unidad
          </button>
          <button onClick={() => abrirWhatsApp(propuesta, "testdrive")}>
            Solicitar test drive
          </button>
        </section>

        <footer className="aqv8-validity">
          <b>✓</b>
          <div>
            <strong>Propuesta válida por {propuesta.vigenciaDias} días</strong>
            <span>
              Emitida el {new Date(propuesta.fecha).toLocaleDateString("es-AR")}{" "}
              · Los precios pueden variar sin previo aviso
            </span>
          </div>
        </footer>
      </main>

      <button
        className="aqv8-floating-whatsapp"
        onClick={() => abrirWhatsApp(propuesta, "consulta")}
        aria-label="Contactar por WhatsApp"
      >
        WhatsApp
      </button>
    </div>
  );
}

function MiniVistaPrevia({
  cliente,
  modelo,
  color,
  formaCompra,
  precioLista,
  bonificacion,
  tipoGasto,
  montoGastos,
  anticipo,
  cuotas,
  valorCuota,
}: {
  cliente: string;
  modelo: ModeloVehiculo;
  color: ColorVehiculo;
  formaCompra: FormaCompra;
  precioLista: number;
  bonificacion: number;
  tipoGasto: TipoGasto;
  montoGastos: number;
  anticipo: number;
  cuotas: number;
  valorCuota: number;
}) {
  const precioFinal = precioLista - bonificacion;

  return (
    <div className="mini-preview">
      <img
        src={color.imagen}
        alt={modelo.nombre}
        onError={(evento) => {
          evento.currentTarget.src = FOTO_AUTO_ALTERNATIVA;
        }}
      />

      <div>
        <span>Propuesta personalizada para</span>
        <h2>{cliente}</h2>

        <small>BYD</small>
        <h1>{modelo.nombre}</h1>
        <p>
          {modelo.tipo} · {color.nombre}
        </p>

        <div className="mini-valores">
          <p>
            Precio de lista
            <strong>{formatoUSD(precioLista)}</strong>
          </p>
          <p>
            Bonificación
            <strong>- {formatoUSD(bonificacion)}</strong>
          </p>
          <p>
            Precio final del vehículo
            <strong>{formatoUSD(precioFinal)}</strong>
          </p>
          {tipoGasto !== "sin-gastos" && (
            <p>
              {tipoGasto === "flete-formulario"
                ? "Flete y formulario"
                : "Patentamiento completo"}
              <strong>{formatoPesos(montoGastos)}</strong>
            </p>
          )}
          <p className="mini-total-operacion">
            Total de la operación
            <strong>"Ver importes separados"</strong>
          </p>
        </div>

        <div className="mini-forma-compra">
          <strong>{formaCompra === "contado" ? "Contado" : "Crédito"}</strong>
          {formaCompra === "credito" && (
            <p>
              Anticipo {formatoUSD(anticipo)} · {cuotas} cuotas de{" "}
              {formatoPesos(valorCuota)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TituloFormulario({
  icono,
  titulo,
  descripcion,
}: {
  icono: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="titulo-formulario">
      <span>{icono}</span>
      <div>
        <h2>{titulo}</h2>
        <p>{descripcion}</p>
      </div>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  cambiar,
  placeholder = "",
  tipo = "text",
}: {
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  placeholder?: string;
  tipo?: string;
}) {
  return (
    <div className="campo">
      <label>{etiqueta}</label>
      <input
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(evento) => cambiar(evento.target.value)}
      />
    </div>
  );
}

function CampoNumero({
  etiqueta,
  valor,
  cambiar,
}: {
  etiqueta: string;
  valor: number;
  cambiar: (valor: number) => void;
}) {
  return (
    <div className="campo">
      <label>{etiqueta}</label>
      <input
        type="number"
        min="0"
        value={valor || ""}
        onChange={(evento) => cambiar(Number(evento.target.value))}
      />
    </div>
  );
}

function Interruptor({
  etiqueta,
  activo,
  cambiar,
}: {
  etiqueta: string;
  activo: boolean;
  cambiar: (activo: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={activo ? "interruptor activo" : "interruptor"}
      onClick={() => cambiar(!activo)}
    >
      <span>{etiqueta}</span>
      <i>{activo ? "Sí" : "No"}</i>
    </button>
  );
}
