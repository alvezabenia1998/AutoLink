import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "./services/supabase";
import {
  guardarPerfil,
  obtenerPerfil,
  subirLogoPerfil,
} from "./services/perfilService";
import "./styles.css";
import "./styles/client-public.css";
import "./styles/advisor-dashboard.css";
import Sidebar from "./components/layout/Sidebar";

type Pantalla =
  | "inicio"
  | "nueva"
  | "propuestas"
  | "catalogo"
  | "configuracion"
  | "clientes"
  | "financiacion"
  | "reportes"
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

type FichaTecnica = {
  datos: { etiqueta: string; valor: string }[];
  equipamiento: string[];
  url: string;
};

type ModeloVehiculo = {
  id: string;
  nombre: string;
  tipo: string;
  versiones: string[];
  garantia: string;
  descripcion: string;
  fichaTecnica: FichaTecnica;
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
  aperturas?: number;
  primeraApertura?: string;
  ultimaApertura?: string;
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
type EstadoEnlacePublico = "cargando" | "listo" | "no-encontrada";

const obtenerIdPropuestaPublica = () => {
  const coincidencia = window.location.pathname.match(/^\/propuesta\/([^/]+)\/?$/);
  return coincidencia
    ? decodeURIComponent(coincidencia[1])
    : new URLSearchParams(window.location.hash.replace(/^#/, "")).get("propuesta");
};

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
    fichaTecnica: {
      datos: [
        { etiqueta: "Autonomía eléctrica", valor: "Hasta 380 km NEDC" },
        { etiqueta: "Batería Blade", valor: "30,08 / 43,2 kWh" },
        { etiqueta: "Carga rápida CC", valor: "65 / 85 kW" },
        { etiqueta: "Baúl", valor: "308 litros" },
        { etiqueta: "Dimensiones", valor: "3.990 × 1.720 × 1.590 mm" },
        { etiqueta: "Plazas", valor: "4 pasajeros" },
      ],
      equipamiento: ["Pantalla giratoria de 10,1 pulgadas", "Apple CarPlay y Android Auto", "6 airbags", "Batería Blade y e-Platform 3.0"],
      url: "https://www.byd.com/content/dam/byd-site/ar/flyers_argentina/ARGENTINA-BYD-DOLPHIN-MINI-flyer-4seats-ES-20250819.pdf",
    },
    colores: [
      {
        id: "dm-white",
        nombre: "Apricity White",
        codigo: "#efefec",
        imagen: "/vehicles/dolphin-white.jpg",
      },
      {
        id: "dm-green",
        nombre: "Sprout Green",
        codigo: "#a8c4aa",
        imagen: "/vehicles/dolphin-green.jpg",
      },
      {
        id: "dm-black",
        nombre: "Polar Night Black",
        codigo: "#151619",
        imagen: "/vehicles/dolphin-black.jpg",
      },
      {
        id: "dm-blue",
        nombre: "Glacier Blue",
        codigo: "#9fc9d7",
        imagen: "/vehicles/dolphin-blue.jpg",
      },
    ],
    cargadores: [
      {
        id: "dm-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador de emergencia para uso doméstico.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "dm-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared para una carga cómoda y segura.",
        imagen: "/chargers/byd-wallbox.png",
        incluidoPorDefecto: false,
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
    fichaTecnica: {
      datos: [
        { etiqueta: "Autonomía eléctrica", valor: "Hasta 380 km NEDC" },
        { etiqueta: "Batería Blade", valor: "45,12 kWh" },
        { etiqueta: "Potencia", valor: "174 CV" },
        { etiqueta: "Torque", valor: "290 Nm" },
        { etiqueta: "Aceleración 0–100", valor: "7,9 segundos" },
        { etiqueta: "Dimensiones", valor: "4.310 × 1.830 × 1.675 mm" },
      ],
      equipamiento: ["Tracción delantera", "Carga rápida CC de 65 kW", "Función VTOL", "Baúl ampliable hasta 1.210 litros"],
      url: "https://www.byd.com/content/dam/byd-site/ar/flyers_argentina/new/AR-BYD-YUAN-PRO-GL-20250828.pdf",
    },
    colores: [
      {
        id: "yp-white",
        nombre: "Snow White",
        codigo: "#efefec",
        imagen: "/vehicles/yuan-white.jpg",
      },
      {
        id: "yp-grey",
        nombre: "Time Grey",
        codigo: "#868b91",
        imagen: "/vehicles/yuan-grey.jpg",
      },
      {
        id: "yp-black",
        nombre: "Obsidian Black",
        codigo: "#17181b",
        imagen: "/vehicles/yuan-black.jpg",
      },
      {
        id: "yp-cyan",
        nombre: "Malachite Dark Cyan",
        codigo: "#174b4b",
        imagen: "/vehicles/yuan-cyan.jpg",
      },
    ],
    cargadores: [
      {
        id: "yp-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil incluido con la unidad.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "yp-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared para una carga cómoda y segura.",
        imagen: "/chargers/byd-wallbox.png",
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
    fichaTecnica: {
      datos: [
        { etiqueta: "Autonomía eléctrica", valor: "71 / 100 km NEDC" },
        { etiqueta: "Batería Blade", valor: "12,9 / 18,3 kWh" },
        { etiqueta: "Motor eléctrico", valor: "145 kW · 300 Nm" },
        { etiqueta: "Aceleración 0–100", valor: "8,3 / 7,9 segundos" },
        { etiqueta: "Tanque", valor: "52 litros" },
        { etiqueta: "Dimensiones", valor: "4.738 × 1.860 × 1.710 mm" },
      ],
      equipamiento: ["Tecnología Super Hybrid DM-i", "Llave digital NFC", "Función VTOL", "Pantalla central giratoria"],
      url: "https://www.byd.com/content/dam/byd-site/ar/flyers_argentina/new/AR-BYD-SONG-PRO-20250903.pdf",
    },
    colores: [
      {
        id: "sp-white",
        nombre: "Snow White",
        codigo: "#efefec",
        imagen: "/vehicles/song-white.jpg",
      },
      {
        id: "sp-grey",
        nombre: "Time Grey",
        codigo: "#858a90",
        imagen: "/vehicles/song-grey.jpg",
      },
      {
        id: "sp-black",
        nombre: "Obsidian Black",
        codigo: "#151619",
        imagen: "/vehicles/song-black.jpg",
      },
      {
        id: "sp-blue",
        nombre: "Atlantis Blue",
        codigo: "#263e53",
        imagen: "/vehicles/song-blue.jpg",
      },
    ],
    cargadores: [
      {
        id: "sp-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil para recarga domiciliaria.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "sp-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared para una carga cómoda y segura.",
        imagen: "/chargers/byd-wallbox.png",
        incluidoPorDefecto: false,
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
    fichaTecnica: {
      datos: [
        { etiqueta: "Autonomía eléctrica", valor: "110 km NEDC" },
        { etiqueta: "Autonomía combinada", valor: "1.100 km NEDC" },
        { etiqueta: "Batería Blade", valor: "18,03 kWh" },
        { etiqueta: "Potencia eléctrica", valor: "145 kW · 300 Nm" },
        { etiqueta: "Aceleración 0–100", valor: "7,5 segundos" },
        { etiqueta: "Baúl", valor: "435 / 1.335 litros" },
      ],
      equipamiento: ["Tecnología Super Hybrid DM-i", "Carga AC de 6,6 kW", "Función VTOL", "Acceso mediante tarjeta o smartphone NFC"],
      url: "https://www.byd.com/material/byd-site/ar/atto-2-dmi/FICHA-TECNICA-ATTO2-DM-i-2026.pdf",
    },
    colores: [
      {
        id: "a2-white",
        nombre: "Skiing White",
        codigo: "#f1f1ef",
        imagen: "/vehicles/atto-white.jpg",
      },
      {
        id: "a2-grey",
        nombre: "Time Grey",
        codigo: "#858a90",
        imagen: "/vehicles/atto-grey.jpg",
      },
      {
        id: "a2-black",
        nombre: "Obsidian Black",
        codigo: "#151619",
        imagen: "/vehicles/atto-black.jpg",
      },
      {
        id: "a2-cyan",
        nombre: "Malachite Dark Cyan",
        codigo: "#174b4b",
        imagen: "/vehicles/atto-cyan.jpg",
      },
    ],
    cargadores: [
      {
        id: "a2-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil incluido.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "a2-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared incluido con la unidad.",
        imagen: "/chargers/byd-wallbox.png",
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
    fichaTecnica: {
      datos: [
        { etiqueta: "Tecnología", valor: "Super Hybrid DM-i" },
        { etiqueta: "Autonomía eléctrica", valor: "Hasta 125 km según versión" },
        { etiqueta: "Baúl", valor: "425 / 1.440 litros" },
        { etiqueta: "Carga rápida", valor: "30–80% en aprox. 35 min" },
        { etiqueta: "Plazas", valor: "5 pasajeros" },
        { etiqueta: "Tracción", valor: "Delantera" },
      ],
      equipamiento: ["Batería Blade", "Pantalla central giratoria", "Asistencias avanzadas a la conducción", "Habitáculo familiar de gran capacidad"],
      url: "https://www.byd.com/es-es/car/seal-u-dm-i",
    },
    colores: [
      {
        id: "su-white",
        nombre: "Snow White",
        codigo: "#f0f0ed",
        imagen: "/vehicles/seal-white.jpg",
      },
      {
        id: "su-time",
        nombre: "Time Gray",
        codigo: "#85898e",
        imagen: "/vehicles/seal-grey.jpg",
      },
      {
        id: "su-smoke",
        nombre: "Smoke Gray",
        codigo: "#5f6267",
        imagen: "/vehicles/seal-smoke.jpg",
      },
      {
        id: "su-black",
        nombre: "Obsidian Black",
        codigo: "#141518",
        imagen: "/vehicles/seal-black.jpg",
      },
    ],
    cargadores: [
      {
        id: "su-portatil",
        nombre: "Cargador portátil",
        descripcion: "Cargador portátil para la unidad.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "su-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared para una carga cómoda y segura.",
        imagen: "/chargers/byd-wallbox.png",
        incluidoPorDefecto: false,
      },
    ],
  },
  {
    id: "shark-dmo",
    nombre: "SHARK DM-O",
    tipo: "Pick-up híbrida enchufable 4x4",
    versiones: ["GS"],
    garantia: "6 años o 150.000 km",
    descripcion:
      "Pick-up híbrida enchufable con plataforma DM-O, 437 CV y tracción integral inteligente.",
    fichaTecnica: {
      datos: [
        { etiqueta: "Potencia combinada", valor: "Más de 430 CV" },
        { etiqueta: "Torque", valor: "650 Nm" },
        { etiqueta: "Autonomía eléctrica", valor: "100 km NEDC" },
        { etiqueta: "Autonomía combinada", valor: "Hasta 840 km" },
        { etiqueta: "Aceleración 0–100", valor: "5,7 segundos" },
        { etiqueta: "Capacidad de remolque", valor: "2.500 kg" },
      ],
      equipamiento: ["Tracción integral eléctrica inteligente", "Más de 20 sistemas ADAS", "Cámara 360° con chasis transparente", "Modos arena, barro, nieve y montaña"],
      url: "https://www.byd.com/ar/byd-shark",
    },
    colores: [
      {
        id: "sh-grey",
        nombre: "Atlantis Grey",
        codigo: "#6f7478",
        imagen: "/vehicles/shark-grey.jpg",
      },
      {
        id: "sh-white",
        nombre: "Pallas White",
        codigo: "#f0f0eb",
        imagen: "/vehicles/shark-white.jpg",
      },
      {
        id: "sh-black",
        nombre: "Obsidian Black",
        codigo: "#17181a",
        imagen: "/vehicles/shark-black.jpg",
      },
      {
        id: "sh-green",
        nombre: "Urdu Milky-Gray Green",
        codigo: "#657068",
        imagen: "/vehicles/shark-green.jpg",
      },
      {
        id: "sh-orange",
        nombre: "Floating Sun Orange",
        codigo: "#bf5a2a",
        imagen: "/vehicles/shark-orange.jpg",
      },
    ],
    cargadores: [
      {
        id: "sh-portatil",
        nombre: "Cargador portátil BYD",
        descripcion: "Cargador portátil incluido para recarga de viaje.",
        imagen: "/chargers/byd-portable.png",
        incluidoPorDefecto: true,
      },
      {
        id: "sh-wallbox",
        nombre: "Wallbox BYD 7 kW",
        descripcion: "Cargador domiciliario de pared incluido con la unidad.",
        imagen: "/chargers/byd-wallbox.png",
        incluidoPorDefecto: true,
      },
    ],
  },
];

const actualizarImagenesOficiales = (catalogo: ModeloVehiculo[]) => {
  const actualizados = catalogo.map((modelo) => {
    const referencia = catalogoInicial.find((item) => item.id === modelo.id);
    if (!referencia) return modelo;

    return {
      ...modelo,
      fichaTecnica: referencia.fichaTecnica,
      colores: referencia.colores.map((colorOficial) => {
        const colorGuardado = modelo.colores.find(
          (color) => color.id === colorOficial.id
        );
        return {
          ...colorOficial,
          ...colorGuardado,
          imagen: colorOficial.imagen,
        };
      }),
      cargadores: referencia.cargadores.map((cargadorOficial) => {
        const cargadorGuardado = modelo.cargadores.find(
          (cargador) => cargador.id === cargadorOficial.id
        );
        return {
          ...cargadorOficial,
          ...cargadorGuardado,
          imagen: cargadorOficial.imagen,
        };
      }),
    };
  });

  const modelosNuevos = catalogoInicial.filter(
    (modeloOficial) =>
      !actualizados.some((modelo) => modelo.id === modeloOficial.id)
  );

  return [...actualizados, ...modelosNuevos];
};

const asesorInicial: Asesor = {
  nombre: "Michael Alvez",
  cargo: "Asesor Comercial BYD",
  telefono: "5491100000000",
  email: "michael@nexora.com",
  foto: "",
  concesionario: "BYD",
  logo: "/brand/byd-logo.svg",
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

const formatoApertura = (fecha?: string) => {
  if (!fecha) return "Todavía no fue vista";

  return `Vista ${new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha))}`;
};

const leerArchivoComoDataURL = (archivo: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });

export default function App() {
  const mostrarFlujoClasico =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("flujo-clasico");
  const [pantalla, setPantalla] = useState<Pantalla>(() => {
    if (!import.meta.env.DEV) return "inicio";
    const vista = new URLSearchParams(window.location.search).get("preview");
    return ["inicio", "nueva", "propuestas", "catalogo", "configuracion"].includes(
      vista || ""
    )
      ? (vista as Pantalla)
      : "inicio";
  });
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
    return Boolean(obtenerIdPropuestaPublica());
  });
  const [estadoEnlacePublico, setEstadoEnlacePublico] =
    useState<EstadoEnlacePublico>(() =>
      obtenerIdPropuestaPublica() ? "cargando" : "listo"
    );
  const [estadoNube, setEstadoNube] =
    useState<EstadoNube>("conectando");
  const [perfilCargado, setPerfilCargado] = useState(false);

  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  const modeloInicial = catalogoInicial.find((modelo) => modelo.id === "shark-dmo") ?? catalogoInicial[0];
  const [modeloId, setModeloId] = useState(modeloInicial.id);
  const [version, setVersion] = useState(modeloInicial.versiones[0]);
  const [colorId, setColorId] = useState(modeloInicial.colores[0].id);

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

  const [cargadoresIncluidos, setCargadoresIncluidos] = useState<string[]>(
    modeloInicial.cargadores.filter((cargador) => cargador.incluidoPorDefecto).map((cargador) => cargador.id)
  );
  const [observaciones, setObservaciones] = useState("");
  const [vigenciaDias, setVigenciaDias] = useState(
    asesorInicial.vigenciaPredeterminada
  );

  const [modeloEditandoId, setModeloEditandoId] = useState(
    catalogoInicial[0].id
  );

  useEffect(() => {
    const iniciar = async () => {
      const parametroPublico = obtenerIdPropuestaPublica();

      const asesorGuardado = localStorage.getItem(STORAGE_ASESOR);
      const catalogoGuardado = localStorage.getItem(STORAGE_CATALOGO);
      
      if (catalogoGuardado) {
        try {
          const catalogoParseado = actualizarImagenesOficiales(
            JSON.parse(catalogoGuardado)
          );
          if (Array.isArray(catalogoParseado) && catalogoParseado.length > 0) {
            setCatalogo(catalogoParseado);
            const inicial = catalogoParseado.find((modelo) => modelo.id === "shark-dmo") ?? catalogoParseado[0];
            setModeloId(inicial.id);
            setVersion(inicial.versiones[0] || "GS");
            setColorId(inicial.colores[0]?.id || "");
            setCargadoresIncluidos(inicial.cargadores.filter((cargador) => cargador.incluidoPorDefecto).map((cargador) => cargador.id));
            setModeloEditandoId(catalogoParseado[0].id);
          }
        } catch {}
      }
      try {
  const { data: catalogoFila, error: errorCatalogo } = await supabase
    .from("catalogo")
    .select("datos")
    .eq("id", 1)
    .maybeSingle();

  if (errorCatalogo) {
    throw errorCatalogo;
  }

  const catalogoNubeSinActualizar = catalogoFila?.datos as
    | ModeloVehiculo[]
    | undefined;
  const catalogoNube = catalogoNubeSinActualizar
    ? actualizarImagenesOficiales(catalogoNubeSinActualizar)
    : undefined;

  if (Array.isArray(catalogoNube) && catalogoNube.length > 0) {
    setCatalogo(catalogoNube);
    const inicial = catalogoNube.find((modelo) => modelo.id === "shark-dmo") ?? catalogoNube[0];
    setModeloId(inicial.id);
    setVersion(inicial.versiones[0] || "GS");
    setColorId(inicial.colores[0]?.id || "");
    setCargadoresIncluidos(inicial.cargadores.filter((cargador) => cargador.incluidoPorDefecto).map((cargador) => cargador.id));
    setModeloEditandoId(catalogoNube[0].id);

    localStorage.setItem(
      STORAGE_CATALOGO,
      JSON.stringify(catalogoNube)
    );
  }
} catch (error) {
  console.error("No se pudo cargar el catálogo desde Supabase:", error);
}

      let asesorLocal = asesorInicial;
      if (asesorGuardado) {
        try {
          asesorLocal = JSON.parse(asesorGuardado);
          setAsesor(asesorLocal);
        } catch {}
      }

      try {
        const perfilNube = await obtenerPerfil();
        if (perfilNube) {
          asesorLocal = { ...asesorInicial, ...perfilNube };
          setAsesor(asesorLocal);
          localStorage.setItem(STORAGE_ASESOR, JSON.stringify(asesorLocal));
        }
      } catch (error) {
        console.error("No se pudo cargar el perfil desde Supabase:", error);
      } finally {
        setPerfilCargado(true);
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
  const filaOriginal = filas?.find(
    (fila) => fila.datos?.propuesta?.id === propuestaEncontrada.id
  );

  let propuestaParaAbrir = propuestaEncontrada;
  const claveApertura = `nexora-apertura-${propuestaEncontrada.id}`;
  const { data: sesionActual } = await supabase.auth.getSession();

  if (
    filaOriginal &&
    !sesionActual.session &&
    !sessionStorage.getItem(claveApertura)
  ) {
    const fechaApertura = new Date().toISOString();
    const propuestaConApertura: Propuesta = {
      ...propuestaEncontrada,
      aperturas: (propuestaEncontrada.aperturas ?? 0) + 1,
      primeraApertura:
        propuestaEncontrada.primeraApertura ?? fechaApertura,
      ultimaApertura: fechaApertura,
    };
    const datosOriginales = filaOriginal.datos as PropuestaDatos | null;

    const { error: errorApertura } = await supabase
      .from("propuestas")
      .update({
        datos: {
          propuesta: propuestaConApertura,
          modelo: datosOriginales?.modelo ?? null,
          asesor: datosOriginales?.asesor ?? asesorLocal,
        } satisfies PropuestaDatos,
      })
      .eq("id", filaOriginal.id);

    if (errorApertura) {
      console.error("No se pudo registrar la apertura:", errorApertura);
    } else {
      sessionStorage.setItem(claveApertura, "1");
      propuestaParaAbrir = propuestaConApertura;
      setPropuestas((actuales) =>
        actuales.map((propuesta) =>
          propuesta.id === propuestaConApertura.id
            ? propuestaConApertura
            : propuesta
        )
      );
    }
  }

  setPropuestaAbierta(propuestaParaAbrir);

  setModeloPropuestaAbierta(filaOriginal?.datos?.modelo ?? null);
  setAsesorPropuestaAbierta(filaOriginal?.datos?.asesor ?? asesorLocal);

  setEsEnlacePublico(true);
  setEstadoEnlacePublico("listo");
  setPantalla("vistaCliente");
} else {
  setEstadoEnlacePublico("no-encontrada");
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
          setEstadoEnlacePublico("listo");
          setPantalla("vistaCliente");
        } else {
          setEstadoEnlacePublico("no-encontrada");
        }
      }
    } catch {
      if (parametroPublico) {
        setEstadoEnlacePublico("no-encontrada");
      }
    }
  }

  if (parametroPublico && !propuestasGuardadas) {
    setEstadoEnlacePublico("no-encontrada");
  }

  setEstadoNube(navigator.onLine ? "error" : "offline");
}    };

    iniciar();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_PROPUESTAS, JSON.stringify(propuestas));
  }, [propuestas]);

  useEffect(() => {
    if (esEnlacePublico) return;

    const canal = supabase
      .channel("propuestas-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "propuestas" },
        (cambio) => {
          const filaActualizada = cambio.new as PropuestaFila | undefined;
          if (!filaActualizada?.datos?.propuesta) return;

          const propuestaActualizada = filaAPropuesta(filaActualizada);
          setPropuestas((actuales) => {
            const existe = actuales.some(
              (propuesta) => propuesta.id === propuestaActualizada.id
            );

            return existe
              ? actuales.map((propuesta) =>
                  propuesta.id === propuestaActualizada.id
                    ? propuestaActualizada
                    : propuesta
                )
              : [propuestaActualizada, ...actuales];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [esEnlacePublico]);

useEffect(() => {
  const guardarCatalogo = async () => {
    localStorage.setItem(
      STORAGE_CATALOGO,
      JSON.stringify(catalogo)
    );

    if (!catalogo.length) return;

    try {
      const { error } = await supabase
        .from("catalogo")
        .upsert(
          {
            id: 1,
            datos: catalogo,
          },
          {
            onConflict: "id",
          }
        );

      if (error) {
        throw error;
      }

      console.log("Catálogo guardado en Supabase.");
    } catch (error) {
      console.error(
        "No se pudo guardar el catálogo en Supabase:",
        error
      );
    }
  };

  guardarCatalogo();
}, [catalogo]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ASESOR, JSON.stringify(asesor));

    if (!perfilCargado || esEnlacePublico) return;

    const temporizador = window.setTimeout(async () => {
      try {
        setEstadoNube("conectando");
        await guardarPerfil(asesor);
        setEstadoNube("sincronizado");
      } catch (error) {
        console.error("No se pudo guardar el perfil en Supabase:", error);
        setEstadoNube("error");
      }
    }, 600);

    return () => window.clearTimeout(temporizador);
  }, [asesor, esEnlacePublico, perfilCargado]);

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
    const primerModelo =
      catalogo.find((modelo) => modelo.id === "shark-dmo") ?? catalogo[0];
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
    setModeloPropuestaAbierta(modeloSeleccionado);
setAsesorPropuestaAbierta(asesor);
    setPantalla("vistaCliente");
    window.scrollTo(0, 0);

    try {
      setEstadoNube("conectando");

    const datos = propuestaAFila(propuesta, modeloSeleccionado, asesor);
    console.log("DATOS A SUPABASE:", datos);

    const { error } = await supabase
      .from("propuestas")
      .insert(datos);
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
  const asesorCorrecto =
    propuestaAbierta?.id === propuesta.id && asesorPropuestaAbierta
      ? asesorPropuestaAbierta
      : asesor;

  const modeloCorrecto =
    propuestaAbierta?.id === propuesta.id && modeloPropuestaAbierta
      ? modeloPropuestaAbierta
      : catalogo.find((item) => item.id === propuesta.modeloId) || catalogo[0];

  let mensaje = `Hola ${asesorCorrecto.nombre}, vi la propuesta del BYD ${modeloCorrecto?.nombre} y quiero hacerte una consulta.`;

  if (accion === "reserva") {
    mensaje = `Hola ${asesorCorrecto.nombre}, quiero avanzar con la reserva del BYD ${modeloCorrecto?.nombre}, versión ${propuesta.version}.`;
  }

  if (accion === "testdrive") {
    mensaje = `Hola ${asesorCorrecto.nombre}, quiero coordinar un test drive del BYD ${modeloCorrecto?.nombre}.`;
  }

  actualizarEstado(propuesta.id, "Interesado");

  window.open(
    `https://wa.me/${asesorCorrecto.telefono.replace(
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
  return `${window.location.origin}/propuesta/${encodeURIComponent(propuesta.id)}`;
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
      fichaTecnica: {
        datos: [],
        equipamiento: [],
        url: "",
      },
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

  try {
    setEstadoNube("conectando");

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "webp";

    const nombreArchivo = `vehiculos/${modeloEditando.id}/${colorIdEditar}-${Date.now()}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from("vehiculos")
      .upload(nombreArchivo, archivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (errorSubida) {
      throw errorSubida;
    }

    const { data } = supabase.storage
      .from("vehiculos")
      .getPublicUrl(nombreArchivo);

    const imagen = data.publicUrl;

    actualizarColor(colorIdEditar, { imagen });

    setEstadoNube("sincronizado");

    console.log("Imagen subida correctamente:", imagen);
  } catch (error) {
    console.error("Error subiendo imagen a Supabase:", error);

    setEstadoNube("error");

    alert("No se pudo subir la imagen a la nube.");
  } finally {
    evento.target.value = "";
  }
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

  const subirLogo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    try {
      setEstadoNube("conectando");
      const logo = await subirLogoPerfil(archivo);
      setAsesor((actual) => ({ ...actual, logo }));
    } catch (error) {
      console.error("No se pudo subir el logo:", error);
      setEstadoNube("error");
      window.alert(
        error instanceof Error ? error.message : "No se pudo subir el logo"
      );
    } finally {
      evento.target.value = "";
    }
  };

  const mostrarMenu = pantalla !== "vistaCliente" && !esEnlacePublico;

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
  };

  if (esEnlacePublico && estadoEnlacePublico !== "listo") {
    return (
      <main className="public-link-state">
        <div className="public-link-state-card">
          <img src="/brand/byd-logo.svg" alt="BYD" />
          {estadoEnlacePublico === "cargando" ? (
            <>
              <span className="public-link-loader" aria-hidden="true" />
              <h1>Estamos preparando tu propuesta</h1>
              <p>Un momento, estamos cargando todos los detalles.</p>
            </>
          ) : (
            <>
              <b>!</b>
              <h1>Este enlace no está disponible</h1>
              <p>
                La propuesta pudo haber vencido o el enlace está incompleto.
                Pedile a tu asesor que te comparta uno nuevo.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

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
    asesorNombre={asesor.nombre}
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
    abrirClientes={() => setPantalla("clientes")}
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

{pantalla === "clientes" && (
  <>
    <header className="encabezado"><div><p className="eyebrow">Gestión comercial</p><h1>Clientes</h1><p>Contactos creados desde tus propuestas.</p></div><button className="boton-verde" onClick={abrirNuevaPropuesta}>＋ Nueva propuesta</button></header>
    <section className="panel premium-data-list">
      {propuestas.length === 0 ? <div className="estado-vacio"><h3>Todavía no hay clientes</h3><p>Los clientes aparecerán al guardar propuestas.</p></div> :
        Array.from(new Map(propuestas.map((propuesta) => [propuesta.telefono || propuesta.email || propuesta.cliente, propuesta])).values()).map((propuesta) => (
          <button key={propuesta.id} onClick={() => abrirPropuesta(propuesta)}><div className="avatar">{propuesta.cliente.slice(0, 2).toUpperCase()}</div><div><strong>{propuesta.cliente}</strong><small>{propuesta.telefono} · {propuesta.email || "Sin correo"}</small></div><span>Ver propuesta →</span></button>
        ))}
    </section>
  </>
)}

{pantalla === "financiacion" && (
  <>
    <header className="encabezado"><div><p className="eyebrow">Operaciones</p><h1>Financiación</h1><p>Propuestas configuradas con crédito.</p></div><button className="boton-verde" onClick={abrirNuevaPropuesta}>＋ Nueva propuesta</button></header>
    <section className="panel premium-data-list">
      {propuestas.filter((propuesta) => propuesta.formaCompra === "credito").length === 0 ? <div className="estado-vacio"><h3>No hay financiaciones registradas</h3><p>Elegí Crédito al crear una propuesta para verla acá.</p></div> : propuestas.filter((propuesta) => propuesta.formaCompra === "credito").map((propuesta) => (
        <button key={propuesta.id} onClick={() => abrirPropuesta(propuesta)}><div className="avatar">{propuesta.cliente.slice(0, 2).toUpperCase()}</div><div><strong>{propuesta.cliente}</strong><small>Anticipo {formatoUSD(propuesta.anticipo)} · {propuesta.cuotas} cuotas</small></div><span>{formatoPesos(propuesta.valorCuota)} →</span></button>
      ))}
    </section>
  </>
)}

{pantalla === "reportes" && (
  <>
    <header className="encabezado"><div><p className="eyebrow">Análisis comercial</p><h1>Reportes</h1><p>Resumen general de tu actividad.</p></div></header>
    <section className="metricas">
      <article className="metrica"><span>▤</span><p>Propuestas totales</p><h2>{propuestas.length}</h2><small>Registradas en Nexora</small></article>
      <article className="metrica"><span>◉</span><p>Operaciones financiadas</p><h2>{propuestas.filter((propuesta) => propuesta.formaCompra === "credito").length}</h2><small>Con plan de crédito</small></article>
      <article className="metrica"><span>✓</span><p>Clientes interesados</p><h2>{propuestas.filter((propuesta) => propuesta.estado === "Interesado").length}</h2><small>Seguimiento comercial</small></article>
    </section>
  </>
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
    subirLogo={subirLogo}
  />
)}
        {pantalla === "nueva" && modeloSeleccionado && colorSeleccionado && (
          <>
            <header className="premium-topbar">
              <button onClick={() => setPantalla("inicio")} aria-label="Volver">←</button>
              <strong>Nueva propuesta</strong>
              <div><span>?</span><span>♢</span></div>
            </header>

            <div className="premium-workspace">
              <div className="premium-main-column">
                <section className="premium-vehicle-card">
                  <div className="premium-vehicle-title">
                    <div>
                      <span>BYD</span>
                      <h1>{modeloSeleccionado.nombre}</h1>
                    </div>
                    <select value={modeloId} onChange={(evento) => seleccionarModelo(evento.target.value)} aria-label="Modelo">
                      {catalogo.map((modelo) => <option value={modelo.id} key={modelo.id}>{modelo.nombre}</option>)}
                    </select>
                  </div>

                  <div className="premium-vehicle-layout">
                    <div className="premium-vehicle-image">
                      <img src={colorSeleccionado.imagen} alt={`${modeloSeleccionado.nombre} ${colorSeleccionado.nombre}`} onError={(evento) => { evento.currentTarget.src = FOTO_AUTO_ALTERNATIVA; }} />
                    </div>
                    <div className="premium-vehicle-options">
                      <label>Versión</label>
                      <select value={version} onChange={(evento) => setVersion(evento.target.value)}>
                        {modeloSeleccionado.versiones.map((item) => <option key={item}>{item}</option>)}
                      </select>
                      <label>Color</label>
                      <div className="premium-colors">
                        {modeloSeleccionado.colores.map((color) => (
                          <button type="button" key={color.id} className={color.id === colorId ? "selected" : ""} style={{ backgroundColor: color.codigo }} title={color.nombre} onClick={() => setColorId(color.id)} />
                        ))}
                      </div>
                      <div className="premium-specs">
                        <p><span>⌁</span>{modeloSeleccionado.tipo}</p>
                        <p><span>◇</span>{modeloSeleccionado.versiones.length} {modeloSeleccionado.versiones.length === 1 ? "versión disponible" : "versiones disponibles"}</p>
                        <p><span>◷</span>{modeloSeleccionado.descripcion}</p>
                        <p><span>▣</span>Garantía {modeloSeleccionado.garantia}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="premium-chargers-card">
                  <div className="premium-section-heading">
                    <div><h2>Carga y accesorios</h2><p>Equipamiento disponible para la versión seleccionada.</p></div>
                  </div>
                  <div className="premium-chargers-grid">
                    {modeloSeleccionado.cargadores.map((cargador) => {
                      const activo = cargadoresIncluidos.includes(cargador.id);
                      return (
                        <button type="button" className={activo ? "premium-charger active" : "premium-charger"} key={cargador.id} onClick={() => setCargadoresIncluidos((actuales) => activo ? actuales.filter((id) => id !== cargador.id) : [...actuales, cargador.id])}>
                          <div className="premium-charger-top"><strong>{cargador.nombre}</strong><span>{activo ? "Incluido" : "Agregar"}</span></div>
                          <div className="premium-charger-body">
                            <img src={cargador.imagen} alt={cargador.nombre} onError={(evento) => { evento.currentTarget.src = FOTO_CARGADOR_ALTERNATIVA; }} />
                            <div><p>◉ Producto original BYD</p><p>⊙ Conector compatible</p><p>▢ Garantía oficial</p></div>
                          </div>
                          <div className="premium-charger-bottom"><span>{activo ? "Incluido" : "Opcional"}</span><strong>USD 0</strong></div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="premium-note">ⓘ Los accesorios incluidos pueden variar según la versión seleccionada.</p>
                </section>

                <section className="premium-details-card">
                  <div className="premium-section-heading"><div><h2>Cliente y condiciones comerciales</h2><p>Información necesaria para generar la propuesta.</p></div></div>
                  <div className="premium-details-grid">
                    <Campo etiqueta="Nombre y apellido" valor={cliente} cambiar={setCliente} placeholder="Ejemplo: Juan Pérez" />
                    <Campo etiqueta="Teléfono" valor={telefono} cambiar={setTelefono} placeholder="11 1234 5678" tipo="tel" />
                    <Campo etiqueta="Correo electrónico" valor={email} cambiar={setEmail} placeholder="cliente@email.com" tipo="email" />
                    <CampoNumero etiqueta="Precio de lista" valor={precioLista} cambiar={setPrecioLista} />
                    <CampoNumero etiqueta="Bonificación" valor={bonificacion} cambiar={setBonificacion} />
                  </div>

                  <div className="premium-commercial-section">
                    <h3>Forma de compra</h3>
                    <div className="premium-choice-row">
                      <button type="button" className={formaCompra === "contado" ? "active" : ""} onClick={() => setFormaCompra("contado")}><strong>Contado</strong><small>Pago total de la unidad</small></button>
                      <button type="button" className={formaCompra === "credito" ? "active" : ""} onClick={() => setFormaCompra("credito")}><strong>Crédito</strong><small>Anticipo y financiación</small></button>
                    </div>
                    {formaCompra === "credito" && (
                      <div className="premium-details-grid premium-subgrid">
                        <CampoNumero etiqueta="Anticipo" valor={anticipo} cambiar={setAnticipo} />
                        <CampoNumero etiqueta="Cantidad de cuotas" valor={cuotas} cambiar={setCuotas} />
                        <CampoNumero etiqueta="Valor de cuota" valor={valorCuota} cambiar={setValorCuota} />
                      </div>
                    )}
                  </div>

                  <div className="premium-commercial-section">
                    <h3>Gastos de la operación</h3>
                    <div className="premium-choice-row premium-expenses">
                      <button type="button" className={tipoGasto === "sin-gastos" ? "active" : ""} onClick={() => { setTipoGasto("sin-gastos"); setMontoGastos(0); }}><strong>Sin gastos</strong><small>No se suman gastos</small></button>
                      <button type="button" className={tipoGasto === "flete-formulario" ? "active" : ""} onClick={() => setTipoGasto("flete-formulario")}><strong>Flete y formulario</strong><small>Cargar importe en pesos</small></button>
                      <button type="button" className={tipoGasto === "patentamiento-completo" ? "active" : ""} onClick={() => setTipoGasto("patentamiento-completo")}><strong>Patentamiento</strong><small>Puesta en calle completa</small></button>
                    </div>
                    {tipoGasto !== "sin-gastos" && (
                      <div className="premium-expense-input"><CampoNumero etiqueta={tipoGasto === "flete-formulario" ? "Monto de flete y formulario" : "Monto de patentamiento completo"} valor={montoGastos} cambiar={setMontoGastos} /></div>
                    )}
                  </div>

                  <div className="premium-commercial-section">
                    <h3>Accesorios</h3>
                    <div className="premium-accessories">
                      <Interruptor etiqueta="Polarizado" activo={accesorios.polarizado} cambiar={(activo) => setAccesorios((actual) => ({ ...actual, polarizado: activo }))} />
                      <Interruptor etiqueta="Tuercas de seguridad" activo={accesorios.tuercas} cambiar={(activo) => setAccesorios((actual) => ({ ...actual, tuercas: activo }))} />
                      <Interruptor etiqueta="Alfombras" activo={accesorios.alfombras} cambiar={(activo) => setAccesorios((actual) => ({ ...actual, alfombras: activo }))} />
                      <Interruptor etiqueta="Patentamiento incluido" activo={accesorios.patentamiento} cambiar={(activo) => setAccesorios((actual) => ({ ...actual, patentamiento: activo }))} />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="premium-summary">
                <h2>Resumen</h2>
                <div><span>Vehículo (Versión {version})</span><strong>{formatoUSD(precioLista)}</strong></div>
                <div><span>Color</span><strong>USD 0</strong></div>
                <div><span>Accesorios</span><strong>USD 0</strong></div>
                <hr />
                <div><span>Bonificación</span><strong>- {formatoUSD(bonificacion)}</strong></div>
                <div><span>Gastos</span><strong>{formatoPesos(montoGastos)}</strong></div>
                <hr />
                <div className="premium-total"><span>Total</span><strong>{formatoUSD(precioFinal)}</strong></div>
                <button className="premium-generate" onClick={guardarYVer}>▤ Generar propuesta</button>
              </aside>
            </div>
          </>
        )}
        {mostrarFlujoClasico && pantalla === "nueva" && (
          <>
            <header className="encabezado encabezado-nueva">
              <div>
                <p className="eyebrow">Nueva cotización</p>
                <h1>Nueva propuesta</h1>
                <p>Completá la información paso a paso.</p>
              </div>

              <button
                className="boton-secundario"
                onClick={() => setPantalla("inicio")}
                aria-label="Volver al inicio"
                title="Volver al inicio"
              >
                ←
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

                  <div className="encabezado-carga">
                    <div>
                      <span className="eyebrow">Equipamiento de carga</span>
                      <h3>Carga y accesorios</h3>
                      <p>
                        Ambos cargadores están disponibles para todas las versiones.
                        Seleccioná cuáles se incluyen en esta propuesta.
                      </p>
                    </div>
                    <span className="contador-carga">
                      {cargadoresIncluidos.length} de {modeloSeleccionado.cargadores.length}
                    </span>
                  </div>

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
                            <span className="estado-cargador">
                              {activo ? "✓ Incluido" : "+ Agregar"}
                            </span>
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
        asesor={asesorPropuestaAbierta ?? asesor}
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
  abrirClientes,
  asesor,
}: {
  propuestas: Propuesta[];
  catalogo: ModeloVehiculo[];
  abrirNuevaPropuesta: () => void;
  abrirPropuesta: (propuesta: Propuesta) => void;
  abrirClientes: () => void;
  asesor: Asesor;
}) {
  const enviadas = propuestas.filter((p) => p.estado === "Enviada").length;
  const interesados = propuestas.filter(
    (p) => p.estado === "Interesado"
  ).length;
  const guardadas = propuestas.filter((p) => p.estado === "Guardada").length;
  const conversion = propuestas.length
    ? Math.round((interesados / propuestas.length) * 100)
    : 0;
  const valorCartera = propuestas.reduce(
    (total, propuesta) =>
      total + Math.max(propuesta.precioLista - propuesta.bonificacion, 0),
    0
  );
  const proximasAVencer = propuestas.filter((propuesta) => {
    const vence =
      new Date(propuesta.fecha).getTime() +
      propuesta.vigenciaDias * 24 * 60 * 60 * 1000;
    const restante = vence - Date.now();
    return restante > 0 && restante <= 48 * 60 * 60 * 1000;
  }).length;
  const fechaActual = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="advisor-dashboard">
      <header className="advisor-header">
        <div>
          <span className="advisor-date">{fechaActual}</span>
          <h1>Buen día, {(asesor.nombre || "Asesor").split(" ")[0]}</h1>
          <p>Este es el estado de tu gestión comercial.</p>
        </div>
        <button className="advisor-primary" onClick={abrirNuevaPropuesta}>
          <DashboardIcon name="plus" /> Nueva propuesta
        </button>
      </header>

      <section className="advisor-metrics" aria-label="Indicadores comerciales">
        <article><div className="advisor-metric-icon navy"><DashboardIcon name="file" /></div><div><span>Propuestas totales</span><strong>{propuestas.length}</strong><small>{guardadas} en preparación</small></div></article>
        <article><div className="advisor-metric-icon blue"><DashboardIcon name="send" /></div><div><span>Enviadas</span><strong>{enviadas}</strong><small>Compartidas con clientes</small></div></article>
        <article><div className="advisor-metric-icon green"><DashboardIcon name="trend" /></div><div><span>Conversión</span><strong>{conversion}%</strong><small>{interesados} clientes interesados</small></div></article>
        <article><div className="advisor-metric-icon amber"><DashboardIcon name="clock" /></div><div><span>Próximas a vencer</span><strong>{proximasAVencer}</strong><small>Dentro de las próximas 48 h</small></div></article>
      </section>

      <section className="advisor-grid">
        <div className="advisor-card advisor-activity">
          <div className="advisor-card-heading"><div><span>ACTIVIDAD</span><h2>Propuestas recientes</h2></div><small>{formatoUSD(valorCartera)} en cartera</small></div>
          {propuestas.length === 0 ? (
            <div className="advisor-empty"><DashboardIcon name="file" /><h3>Tu actividad comenzará acá</h3><p>Creá la primera propuesta para iniciar el seguimiento.</p><button onClick={abrirNuevaPropuesta}>Crear propuesta</button></div>
          ) : (
            <div className="advisor-table">
              {propuestas.slice(0, 5).map((propuesta) => {
                const modelo = catalogo.find((item) => item.id === propuesta.modeloId);
                const iniciales = propuesta.cliente.split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
                return <button key={propuesta.id} onClick={() => abrirPropuesta(propuesta)}>
                  <span className="advisor-avatar">{iniciales}</span>
                  <span className="advisor-client"><strong>{propuesta.cliente}</strong><small>BYD {modelo?.nombre || "Vehículo"} · {formatoApertura(propuesta.ultimaApertura)}</small></span>
                  <span className={`advisor-status status-${propuesta.estado.toLowerCase()}`}>{propuesta.estado}</span>
                  <span className="advisor-amount">{formatoUSD(Math.max(propuesta.precioLista - propuesta.bonificacion, 0))}</span>
                  <DashboardIcon name="arrow" />
                </button>;
              })}
            </div>
          )}
        </div>

        <aside className="advisor-side">
          <section className="advisor-card advisor-pipeline">
            <div className="advisor-card-heading"><div><span>EMBUDO COMERCIAL</span><h2>Estado de oportunidades</h2></div></div>
            <div className="pipeline-bar"><i style={{ width: `${propuestas.length ? (guardadas / propuestas.length) * 100 : 33}%` }} /><i style={{ width: `${propuestas.length ? (enviadas / propuestas.length) * 100 : 33}%` }} /><i style={{ width: `${propuestas.length ? (interesados / propuestas.length) * 100 : 34}%` }} /></div>
            <div className="pipeline-list"><p><i className="draft" /><span>En preparación</span><strong>{guardadas}</strong></p><p><i className="sent" /><span>Enviadas</span><strong>{enviadas}</strong></p><p><i className="interested" /><span>Interesados</span><strong>{interesados}</strong></p></div>
          </section>
          <section className="advisor-card advisor-quick">
            <div className="advisor-card-heading"><div><span>ACCESO RÁPIDO</span><h2>Acciones frecuentes</h2></div></div>
            <button onClick={abrirNuevaPropuesta}><DashboardIcon name="plus" /><span><strong>Nueva propuesta</strong><small>Configurá una unidad</small></span><DashboardIcon name="arrow" /></button>
            <button onClick={abrirClientes}><DashboardIcon name="users" /><span><strong>Ver clientes</strong><small>Revisá tus contactos</small></span><DashboardIcon name="arrow" /></button>
          </section>
        </aside>
      </section>
    </div>
  );
}

function DashboardIcon({ name }: { name: "plus" | "file" | "send" | "trend" | "clock" | "arrow" | "users" }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <><path d="m9 18 6-6-6-6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
                    {propuesta.ultimaApertura && (
                      <small className="apertura-propuesta">
                        {formatoApertura(propuesta.ultimaApertura)} · {propuesta.aperturas ?? 1} {(propuesta.aperturas ?? 1) === 1 ? "apertura" : "aperturas"}
                      </small>
                    )}
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
  subirLogo,
}: {
  asesor: Asesor;
  setAsesor: React.Dispatch<React.SetStateAction<Asesor>>;
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
          ✓ Configuración sincronizada con tu cuenta
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

  const [colorActivoId, setColorActivoId] = useState(propuesta.colorId);
  const [cambiandoImagen, setCambiandoImagen] = useState(false);
  const [fichaExpandida, setFichaExpandida] = useState(false);
  const [porcentajeAnticipo, setPorcentajeAnticipo] = useState(30);
  const [plazoSimulado, setPlazoSimulado] = useState(36);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);
  const modeloBase =
    modeloGuardado ||
    catalogo.find((item) => item.id === propuesta.modeloId);

  if (!modeloBase) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>No se encontró el vehículo</h2>
        <p>Esta propuesta fue creada con un modelo que ya no existe.</p>
      </div>
    );
  }
  const fichaReferencia = catalogo.find((item) => item.id === propuesta.modeloId)?.fichaTecnica;
  const modelo = {
    ...modeloBase,
    fichaTecnica: modeloBase.fichaTecnica ?? fichaReferencia ?? { datos: [], equipamiento: [], url: "" },
  };
  const color =
  modelo.colores.find((item) => item.id === colorActivoId) ||
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
  const anticipoSimulado = Math.round((precioFinal * porcentajeAnticipo) / 100);
  const cuotaSimulada = Math.round((precioFinal - anticipoSimulado) / plazoSimulado);
  const fechaVencimiento =
    new Date(propuesta.fecha).getTime() +
    propuesta.vigenciaDias * 24 * 60 * 60 * 1000;
  const tiempoRestante = Math.max(fechaVencimiento - ahora, 0);
  const diasRestantes = Math.floor(tiempoRestante / 86400000);
  const horasRestantes = Math.floor((tiempoRestante % 86400000) / 3600000);
  const minutosRestantes = Math.floor((tiempoRestante % 3600000) / 60000);
  const segundosRestantes = Math.floor((tiempoRestante % 60000) / 1000);
  const propuestaVencida = tiempoRestante <= 0;

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
              <strong className="aqv8-version-pill">Versión {propuesta.version}</strong>
            </div>
          </div>

          <div className="aqv8-car-frame">
            <img
              className={cambiandoImagen ? "cambiando" : ""}
              src={color.imagen}
              alt={`${modelo.nombre} en color ${color.nombre}`}
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
            <button
              type="button"
              key={opcion.id}
              className={opcion.id === color.id ? "activo" : ""}
              style={{ backgroundColor: opcion.codigo }}
              title={opcion.nombre}
              aria-label={`Ver color ${opcion.nombre}`}
          onClick={() => {
            setCambiandoImagen(true);

            setTimeout(() => {
              setColorActivoId(opcion.id);
              setCambiandoImagen(false);
            }, 180);
          }}            />
          ))}            </div>
          </div>
        </section>

        <nav className="aqv8-client-nav" aria-label="Secciones de la propuesta">
          <button onClick={() => document.getElementById("resumen-propuesta")?.scrollIntoView({ behavior: "smooth" })}>⌂ Resumen</button>
          <button onClick={() => { setFichaExpandida(true); window.setTimeout(() => document.getElementById("ficha-tecnica")?.scrollIntoView({ behavior: "smooth" }), 50); }}>▤ Ficha técnica</button>
          <button onClick={() => document.getElementById("equipamiento-propuesta")?.scrollIntoView({ behavior: "smooth" })}>◇ Equipamiento</button>
          {propuesta.formaCompra === "credito" && <button onClick={() => document.getElementById("financiacion-propuesta")?.scrollIntoView({ behavior: "smooth" })}>◉ Financiación</button>}
        </nav>

        <section className="aqv8-price-card" id="resumen-propuesta">
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

        <section className="aqv8-tech-card" id="ficha-tecnica">
          <div className="aqv8-tech-heading">
            <div>
              <span>CONOCÉ TU BYD</span>
              <h2>Ficha técnica</h2>
              <p>Principales especificaciones de la versión {propuesta.version}.</p>
            </div>
            <div>
              <button type="button" onClick={() => setFichaExpandida((actual) => !actual)}>{fichaExpandida ? "Ocultar detalles" : "Ver ficha completa"}</button>
            </div>
          </div>
          {fichaExpandida && (
            <div className="aqv8-tech-content">
              <div className="aqv8-tech-stats">
                {modelo.fichaTecnica.datos.map((dato) => (
                  <article key={dato.etiqueta}><span>{dato.etiqueta}</span><strong>{dato.valor}</strong></article>
                ))}
              </div>
              <div className="aqv8-tech-equipment">
                <h3>Equipamiento destacado</h3>
                <div>{modelo.fichaTecnica.equipamiento.map((item) => <span key={item}>✓ {item}</span>)}</div>
              </div>
              <small>Información basada en documentación oficial BYD. Las características pueden variar según versión y disponibilidad comercial.</small>
            </div>
          )}
        </section>

        <section className="aqv8-section" id="financiacion-propuesta">
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

        {propuesta.formaCompra === "credito" && <section className="aqv8-finance-simulator">
          <div className="aqv8-section-title">
            <span>SIMULÁ TU OPERACIÓN</span>
            <h2>Financiación estimada</h2>
          </div>
          <div className="aqv8-finance-grid">
            <div>
              <label>Anticipo: <strong>{porcentajeAnticipo}%</strong></label>
              <input type="range" min="10" max="80" step="5" value={porcentajeAnticipo} onChange={(evento) => setPorcentajeAnticipo(Number(evento.target.value))} />
              <span>{formatoUSD(anticipoSimulado)}</span>
            </div>
            <div>
              <label htmlFor="plazo-simulado">Plazo</label>
              <select id="plazo-simulado" value={plazoSimulado} onChange={(evento) => setPlazoSimulado(Number(evento.target.value))}>
                {[12, 24, 36, 48, 60].map((plazo) => <option value={plazo} key={plazo}>{plazo} meses</option>)}
              </select>
            </div>
            <article><span>Cuota estimada sin interés</span><strong>{formatoUSD(cuotaSimulada)}</strong><small>Valor orientativo. Sujeto a condiciones de financiación.</small></article>
          </div>
        </section>}

        {cargadores.length > 0 && (
          <section className="aqv8-section" id="equipamiento-propuesta">
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

        <footer className={propuestaVencida ? "aqv8-validity vencida" : "aqv8-validity"}>
          <div className="aqv8-validity-heading">
            <b>{propuestaVencida ? "!" : "⌛"}</b>
            <div>
              <small>VIGENCIA DE LA PROPUESTA</small>
              <strong>{propuestaVencida ? "Esta propuesta venció" : "Reservá antes de que finalice"}</strong>
            </div>
          </div>
          <div className="aqv8-validity-detail">
            {!propuestaVencida && (
              <div className="aqv8-countdown">
                <span><b>{String(diasRestantes).padStart(2, "0")}</b><small>DÍAS</small></span>
                <i>:</i>
                <span><b>{String(horasRestantes).padStart(2, "0")}</b><small>HORAS</small></span>
                <i>:</i>
                <span><b>{String(minutosRestantes).padStart(2, "0")}</b><small>MIN</small></span>
                <i>:</i>
                <span><b>{String(segundosRestantes).padStart(2, "0")}</b><small>SEG</small></span>
              </div>
            )}
            <p>
              Emitida el {new Date(propuesta.fecha).toLocaleDateString("es-AR")} · Válida hasta el {new Date(fechaVencimiento).toLocaleDateString("es-AR")}
            </p>
          </div>
        </footer>
      </main>

      <aside className="aqv8-sticky-actions" aria-label="Acciones rápidas">
        <div><span>Precio final</span><strong>{formatoUSD(precioFinal)}</strong></div>
        <button onClick={() => abrirWhatsApp(propuesta, "consulta")}>Hablar con mi asesor</button>
        <button onClick={() => abrirWhatsApp(propuesta, "reserva")}>Reservar unidad</button>
      </aside>

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
