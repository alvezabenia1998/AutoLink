import { supabase } from "./supabase";

export type PerfilComercial = {
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

export async function obtenerPerfil() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select(
      "nombre,cargo,telefono,email,foto,concesionario,logo,texto_entrega,garantia_predeterminada,vigencia_predeterminada"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    nombre: data.nombre ?? "",
    cargo: data.cargo ?? "",
    telefono: data.telefono ?? "",
    email: data.email ?? "",
    foto: data.foto ?? "",
    concesionario: data.concesionario ?? "",
    logo: data.logo || "/brand/byd-logo.svg",
    textoEntrega: data.texto_entrega ?? "",
    garantiaPredeterminada: data.garantia_predeterminada ?? "",
    vigenciaPredeterminada: data.vigencia_predeterminada ?? 5,
  } satisfies PerfilComercial;
}

export async function guardarPerfil(perfil: PerfilComercial) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("perfiles")
    .upsert(
      {
        user_id: user.id,
        nombre: perfil.nombre,
        cargo: perfil.cargo,
        telefono: perfil.telefono,
        email: perfil.email,
        foto: perfil.foto,
        concesionario: perfil.concesionario,
        logo: perfil.logo,
        texto_entrega: perfil.textoEntrega,
        garantia_predeterminada: perfil.garantiaPredeterminada,
        vigencia_predeterminada: perfil.vigenciaPredeterminada,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export async function subirLogoPerfil(archivo: File) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");
  if (!archivo.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen");
  }
  if (archivo.size > 5 * 1024 * 1024) {
    throw new Error("El logo no puede superar los 5 MB");
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase() || "webp";
  const ruta = `perfiles/${user.id}/logo.${extension}`;
  const { error } = await supabase.storage.from("vehiculos").upload(ruta, archivo, {
    cacheControl: "3600",
    upsert: true,
    contentType: archivo.type,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("vehiculos").getPublicUrl(ruta);
  return `${data.publicUrl}?v=${Date.now()}`;
}
