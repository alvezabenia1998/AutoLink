import { supabase } from "./supabase";

export async function obtenerPerfil() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function guardarPerfil(perfil: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario no autenticado");

  const { error } = await supabase
    .from("perfiles")
    .upsert({
      user_id: user.id,
      ...perfil,
    });

  if (error) throw error;
}