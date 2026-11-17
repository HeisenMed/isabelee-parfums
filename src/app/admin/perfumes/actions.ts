"use server";

/**
 * src/app/admin/perfumes/actions.ts — Acciones de servidor del catálogo.
 *
 * QUÉ ES
 *   Las Server Actions (funciones del servidor que un formulario o un botón
 *   del navegador puede invocar directamente) con las que el panel modifica
 *   perfumes:
 *
 *     guardarPerfume    crea uno nuevo o guarda los cambios de uno existente
 *     alternarActivo    lo muestra u oculta en la tienda (interruptor)
 *     duplicarPerfumeAccion   crea una copia y abre su formulario
 *     eliminarPerfumeAccion   lo borra, tras confirmar escribiendo su nombre
 *     actualizarPrecios lo usa la edición rápida de precios (Fase 5C):
 *                       guarda solo precio y precio anterior
 *
 * POR QUÉ EXISTE
 *   Es el único camino por el que el navegador puede escribir en el
 *   catálogo, y por eso concentra las tres defensas:
 *     1. PERMISO. Cada acción empieza llamando a comprobarAccesoAdmin(). Una
 *        Server Action es, por dentro, una dirección pública a la que se
 *        puede llamar sin pasar por ninguna página: que el layout del panel
 *        esté protegido no la protege a ella.
 *     2. VALIDACIÓN. Lo que llega del formulario se revisa aquí, en el
 *        servidor. Las comprobaciones del navegador son una comodidad para
 *        quien escribe; se pueden saltar.
 *     3. RLS (Row Level Security, las reglas de acceso por fila de
 *        Postgres). Las funciones de src/lib/admin-perfumes.ts escriben con
 *        la sesión de la administradora, así que la base de datos vuelve a
 *        comprobar que lo es.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Las invocan los componentes de src/components/admin/:
 *     FormularioPerfume (guardar), ListaPerfumes (interruptor, duplicar) y
 *     DialogoEliminar (eliminar).
 *   - Delegan la lectura y escritura en src/lib/admin-perfumes.ts.
 *   - Tras cada escritura llaman a revalidatePath(): la portada y las
 *     fichas de la tienda se guardan en caché 60 segundos, y esto la
 *     descarta al momento para que el cambio se vea de inmediato.
 *   - Este archivo está en src/app/admin/perfumes/ (fuera del grupo
 *     (panel)), junto a src/app/admin/actions.ts; las páginas que lo usan
 *     están en src/app/admin/(panel)/perfumes/. La carpeta no contiene
 *     ningún page.tsx, así que no crea ninguna ruta por sí misma.
 *   - redirect() funciona lanzando una excepción especial que Next.js
 *     intercepta: nunca debe ir dentro de un try/catch.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import {
  actualizarPerfume,
  cambiarActivo,
  crearPerfume,
  duplicarPerfume,
  eliminarPerfume,
  obtenerPerfumeAdmin,
} from "@/lib/admin-perfumes";
import { RUTA_PERFUMES, rutaPerfume } from "@/lib/admin-rutas";
import {
  BADGE_OTRO,
  GENEROS,
  type Genero,
  type PerfumeEditable,
} from "@/types/perfume";

/* ── Tipos que comparten las acciones y los formularios ─────────────── */

/** Campos del formulario que pueden llevar un mensaje de error propio. */
export type CampoPerfume =
  | "nombre"
  | "marca"
  | "genero"
  | "concentracion"
  | "volumen"
  | "precio"
  | "precio_original"
  | "descripcion"
  | "descripcion_olfativa"
  | "familia_olfativa"
  | "notas"
  | "ocasiones"
  | "badge";

/** Lo que el formulario de perfume recibe tras intentar guardar. */
export type EstadoPerfume = {
  /** true = se guardó. */
  ok: boolean;
  /** Mensaje general (éxito o error que no es de un campo concreto). */
  mensaje: string | null;
  /** Error de cada campo, para mostrarlo junto a él. */
  errores: Partial<Record<CampoPerfume, string>>;
  /**
   * Momento de la respuesta. Cambia en cada envío, así el formulario
   * distingue "se guardó otra vez" de "sigue siendo el aviso de antes".
   */
  marca: number;
};

/** Resultado de las acciones que no son formularios completos. */
export type ResultadoAccion = { ok: true } | { ok: false; error: string };

/** Lo que el diálogo de eliminar recibe si el borrado no se hizo. */
export type EstadoEliminar = { error: string | null };

/* ── Límites y mensajes ─────────────────────────────────────────────── */

/** Longitudes máximas, para que un pegado accidental no rompa la tienda. */
const MAX_TEXTO_CORTO = 120;
const MAX_TEXTO_LARGO = 2000;
const MAX_ETIQUETA = 60;
const MAX_ETIQUETAS = 30;
/** NUMERIC(12,2) admite hasta 9.999.999.999,99; se deja margen de sobra. */
const MAX_PRECIO = 999_999_999;

const ERROR_SIN_ACCESO =
  "Tu sesión caducó o tu cuenta no tiene permiso. Recarga la página y vuelve a entrar.";

/* ── Utilidades ─────────────────────────────────────────────────────── */

/**
 * Comprueba que quien llama es administrador.
 * Devuelve null si puede continuar, o el mensaje de error si no.
 */
async function errorDeAcceso(): Promise<string | null> {
  const acceso = await comprobarAccesoAdmin();
  return acceso.estado === "ok" ? null : ERROR_SIN_ACCESO;
}

/** Lee un campo de texto del formulario, recortado; "" si falta. */
function texto(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Convierte "12" en 12; null si no es un id válido. */
function leerId(valor: FormDataEntryValue | string | number | null): number | null {
  const crudo = typeof valor === "number" ? String(valor) : valor;
  if (typeof crudo !== "string" || !/^\d{1,9}$/.test(crudo)) return null;
  const id = Number(crudo);
  return id > 0 ? id : null;
}

/**
 * Interpreta un precio escrito por una persona.
 * Acepta "189000", "189.000" o "$ 189.000": se quitan el signo de pesos,
 * los espacios y los puntos de millar. Devuelve:
 *   { valor: null }   campo vacío (sin precio: estado válido)
 *   { valor: 189000 } entero ≥ 0
 *   { error: "..." }  cualquier otra cosa
 */
function leerPrecio(crudo: string): { valor: number | null } | { error: string } {
  const limpio = crudo.replace(/[$.\s]/g, "");
  if (limpio === "") return { valor: null };
  if (!/^\d+$/.test(limpio)) {
    return { error: "Escribe solo números, sin decimales. Ejemplo: 189000." };
  }
  const valor = Number(limpio);
  if (valor > MAX_PRECIO) return { error: "Ese precio es demasiado alto." };
  return { valor };
}

/**
 * Lee una lista de etiquetas (notas u ocasiones). El formulario la envía
 * como texto JSON (JavaScript Object Notation) en un campo oculto, por
 * ejemplo '["Bergamota","Limón"]'. Se limpia: recorta espacios, descarta
 * vacíos y elimina repetidos sin distinguir mayúsculas.
 */
function leerEtiquetas(
  formData: FormData,
  nombre: string,
): { valor: string[] } | { error: string } {
  const crudo = texto(formData, nombre);
  if (!crudo) return { valor: [] };

  let lista: unknown;
  try {
    lista = JSON.parse(crudo);
  } catch {
    return { error: "No se pudo leer la lista. Recarga la página." };
  }
  if (!Array.isArray(lista)) {
    return { error: "No se pudo leer la lista. Recarga la página." };
  }

  const vistos = new Set<string>();
  const valor: string[] = [];
  for (const elemento of lista) {
    if (typeof elemento !== "string") continue;
    const limpio = elemento.trim().replace(/\s+/g, " ");
    if (!limpio) continue;
    if (limpio.length > MAX_ETIQUETA) {
      return { error: `Cada elemento admite como máximo ${MAX_ETIQUETA} caracteres.` };
    }
    const clave = limpio.toLocaleLowerCase("es");
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    valor.push(limpio);
  }
  if (valor.length > MAX_ETIQUETAS) {
    return { error: `Como máximo ${MAX_ETIQUETAS} elementos por lista.` };
  }
  return { valor };
}

/** Descarta la caché de las páginas de la tienda que muestran un perfume. */
function refrescarTienda(id: number): void {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath(`/producto/${id}`);
}

/* ── Validación del formulario ──────────────────────────────────────── */

/**
 * Convierte el formulario en datos listos para guardar, o en la lista de
 * errores por campo. No guarda nada.
 */
function validar(
  formData: FormData,
):
  | { datos: PerfumeEditable; errores: null }
  | { datos: null; errores: Partial<Record<CampoPerfume, string>> } {
  const errores: Partial<Record<CampoPerfume, string>> = {};

  /** Texto opcional con longitud máxima; anota el error si se pasa. */
  const opcional = (campo: CampoPerfume, max: number): string => {
    const valor = texto(formData, campo);
    if (valor.length > max) {
      errores[campo] = `Máximo ${max} caracteres (ahora tiene ${valor.length}).`;
    }
    return valor;
  };

  const nombre = opcional("nombre", MAX_TEXTO_CORTO);
  if (!nombre) errores.nombre = "Escribe el nombre del perfume.";

  const marca = opcional("marca", MAX_TEXTO_CORTO);
  if (!marca) errores.marca = "Escribe la marca.";

  const generoCrudo = texto(formData, "genero");
  const genero = GENEROS.find((g) => g === generoCrudo) as Genero | undefined;
  if (!genero) errores.genero = "Elige Hombre, Mujer o Unisex.";

  const concentracion = opcional("concentracion", MAX_TEXTO_CORTO);
  const volumen = opcional("volumen", MAX_TEXTO_CORTO);
  const familia_olfativa = opcional("familia_olfativa", MAX_TEXTO_CORTO);
  const descripcion = opcional("descripcion", MAX_TEXTO_LARGO);
  const descripcion_olfativa = opcional("descripcion_olfativa", MAX_TEXTO_LARGO);

  // Precios
  const precio = leerPrecio(texto(formData, "precio"));
  if ("error" in precio) errores.precio = precio.error;
  const precioOriginal = leerPrecio(texto(formData, "precio_original"));
  if ("error" in precioOriginal) errores.precio_original = precioOriginal.error;

  if (
    "valor" in precio &&
    "valor" in precioOriginal &&
    precioOriginal.valor !== null
  ) {
    if (precio.valor === null) {
      errores.precio_original =
        "Para mostrar un precio anterior, escribe primero el precio actual.";
    } else if (precioOriginal.valor <= precio.valor) {
      errores.precio_original =
        "El precio anterior debe ser mayor que el precio actual. Si no hay descuento, déjalo vacío.";
    }
  }

  // Notas y ocasiones
  const salida = leerEtiquetas(formData, "notas_salida");
  const corazon = leerEtiquetas(formData, "notas_corazon");
  const fondo = leerEtiquetas(formData, "notas_fondo");
  const errorNotas = [salida, corazon, fondo].find((lista) => "error" in lista);
  if (errorNotas && "error" in errorNotas) errores.notas = errorNotas.error;

  const ocasiones = leerEtiquetas(formData, "ocasiones");
  if ("error" in ocasiones) errores.ocasiones = ocasiones.error;

  // Badge: una opción de la lista, o texto libre si se eligió "Otro…".
  const badgeElegido = texto(formData, "badge");
  let badge: string | null = badgeElegido || null;
  if (badgeElegido === BADGE_OTRO) {
    const otro = texto(formData, "badge_otro");
    if (!otro) {
      errores.badge = "Escribe el texto del badge o elige «(ninguno)».";
    } else if (otro.length > 30) {
      errores.badge = "El badge admite como máximo 30 caracteres.";
    }
    badge = otro || null;
  } else if (badgeElegido.length > 30) {
    errores.badge = "El badge admite como máximo 30 caracteres.";
  }

  if (Object.keys(errores).length > 0 || !genero) {
    return { datos: null, errores };
  }

  return {
    errores: null,
    datos: {
      nombre,
      marca,
      genero,
      concentracion,
      volumen,
      familia_olfativa,
      descripcion,
      descripcion_olfativa,
      precio: "valor" in precio ? precio.valor : null,
      precio_original: "valor" in precioOriginal ? precioOriginal.valor : null,
      notas: {
        salida: "valor" in salida ? salida.valor : [],
        corazon: "valor" in corazon ? corazon.valor : [],
        fondo: "valor" in fondo ? fondo.valor : [],
      },
      ocasiones: "valor" in ocasiones ? ocasiones.valor : [],
      // Los interruptores envían "true" o "false" en un campo oculto.
      activo: texto(formData, "activo") === "true",
      destacado: texto(formData, "destacado") === "true",
      agotado: texto(formData, "agotado") === "true",
      badge,
    },
  };
}

/* ── Acciones ───────────────────────────────────────────────────────── */

/**
 * Crea o actualiza un perfume, según el formulario traiga o no un `id`.
 * `_previo` es el estado anterior que exige useActionState; no se usa.
 */
export async function guardarPerfume(
  _previo: EstadoPerfume,
  formData: FormData,
): Promise<EstadoPerfume> {
  const base = { errores: {}, marca: Date.now() };

  const sinAcceso = await errorDeAcceso();
  if (sinAcceso) return { ...base, ok: false, mensaje: sinAcceso };

  const validacion = validar(formData);
  if (!validacion.datos) {
    return {
      ok: false,
      mensaje: "Revisa los campos marcados en rojo.",
      errores: validacion.errores,
      marca: Date.now(),
    };
  }

  const idCrudo = formData.get("id");
  const esNuevo = idCrudo === null || idCrudo === "";

  if (esNuevo) {
    const creado = await crearPerfume(validacion.datos);
    if (!creado.ok) return { ...base, ok: false, mensaje: creado.error };
    refrescarTienda(creado.perfume.id);
    // Se pasa al formulario de edición del perfume recién creado, que
    // muestra el aviso "Perfume creado".
    redirect(`${rutaPerfume(creado.perfume.id)}?aviso=creado`);
  }

  const id = leerId(idCrudo);
  if (!id) {
    return { ...base, ok: false, mensaje: "No se reconoce el perfume. Recarga la página." };
  }

  const guardado = await actualizarPerfume(id, validacion.datos);
  if (!guardado.ok) return { ...base, ok: false, mensaje: guardado.error };

  refrescarTienda(id);
  return { ...base, ok: true, mensaje: "Cambios guardados" };
}

/**
 * Muestra u oculta un perfume en la tienda. La llama el interruptor de la
 * lista, que ya cambió en pantalla antes de recibir respuesta (interfaz
 * optimista) y se deshace si aquí se devuelve un error.
 */
export async function alternarActivo(
  id: number,
  activo: boolean,
): Promise<ResultadoAccion> {
  const sinAcceso = await errorDeAcceso();
  if (sinAcceso) return { ok: false, error: sinAcceso };

  // Los argumentos de una Server Action llegan del navegador: se validan
  // aunque TypeScript diga que son number y boolean.
  const idValido = leerId(id);
  if (!idValido || typeof activo !== "boolean") {
    return { ok: false, error: "No se reconoce el perfume. Recarga la página." };
  }

  const resultado = await cambiarActivo(idValido, activo);
  if (!resultado.ok) return { ok: false, error: resultado.error };

  refrescarTienda(idValido);
  return { ok: true };
}

/**
 * Duplica un perfume y abre el formulario de la copia.
 * Se usa como <form action={...}> con un campo oculto `id`. Si algo falla,
 * vuelve a la lista con un aviso (un formulario así no tiene dónde mostrar
 * un error propio).
 */
export async function duplicarPerfumeAccion(formData: FormData): Promise<void> {
  const sinAcceso = await errorDeAcceso();
  const id = leerId(formData.get("id"));
  if (sinAcceso || !id) redirect(`${RUTA_PERFUMES}?aviso=error-duplicar`);

  const copia = await duplicarPerfume(id);
  if (!copia.ok) redirect(`${RUTA_PERFUMES}?aviso=error-duplicar`);

  // La copia nace inactiva, así que la tienda no cambia; aun así se
  // refresca por si en el futuro cambiara ese comportamiento.
  refrescarTienda(copia.perfume.id);
  redirect(`${rutaPerfume(copia.perfume.id)}?aviso=duplicado`);
}

/**
 * Elimina un perfume para siempre. Exige que el formulario traiga el
 * nombre EXACTO del perfume en `confirmacion`: se comprueba aquí, en el
 * servidor, contra el nombre real guardado, no contra lo que diga el
 * navegador.
 */
export async function eliminarPerfumeAccion(
  _previo: EstadoEliminar,
  formData: FormData,
): Promise<EstadoEliminar> {
  const sinAcceso = await errorDeAcceso();
  if (sinAcceso) return { error: sinAcceso };

  const id = leerId(formData.get("id"));
  if (!id) return { error: "No se reconoce el perfume. Recarga la página." };

  const actual = await obtenerPerfumeAdmin(id);
  if (!actual.ok) return { error: actual.error };
  if (!actual.perfume) {
    return { error: "Ese perfume ya no existe. Recarga la página." };
  }

  // Debe coincidir letra por letra (mayúsculas y tildes incluidas); solo
  // se ignoran los espacios al principio y al final.
  if (texto(formData, "confirmacion") !== actual.perfume.nombre.trim()) {
    return {
      error:
        "El nombre no coincide. Escríbelo exactamente igual, con sus mayúsculas y tildes.",
    };
  }

  const resultado = await eliminarPerfume(id);
  if (!resultado.ok) return { error: resultado.error };

  refrescarTienda(id);
  // Si quedaron archivos sin borrar en Storage, la lista lo avisa: el
  // perfume ya está eliminado y eso no se debe ocultar.
  redirect(
    `${RUTA_PERFUMES}?aviso=${resultado.avisos.length > 0 ? "eliminado-con-avisos" : "eliminado"}`,
  );
}

/* ── Edición rápida de precios (Fase 5C) ────────────────────────────── */

/** Resultado de guardar los precios de una fila. */
export type ResultadoPrecios =
  | { ok: true; precio: number | null; precio_original: number | null }
  | { ok: false; error: string };

/**
 * Guarda SOLO el precio y el precio anterior de un perfume. La usa la
 * pantalla de edición rápida (/admin/perfumes/precios), fila por fila.
 *
 * Las reglas son las mismas que en el formulario completo (validar()):
 *   - cada precio, entero ≥ 0 o vacío (vacío = "Consultar precio");
 *   - el precio anterior solo con precio actual, y MAYOR que él.
 * Los textos llegan tal como se escribieron ("189.000"); leerPrecio() los
 * convierte. Solo se actualizan estas dos columnas: nada más del perfume
 * cambia, ni aunque el navegador enviara otros datos.
 */
export async function actualizarPrecios(
  id: number,
  precioTexto: string,
  precioOriginalTexto: string,
): Promise<ResultadoPrecios> {
  const sinAcceso = await errorDeAcceso();
  if (sinAcceso) return { ok: false, error: sinAcceso };

  const idValido = leerId(id);
  if (!idValido || typeof precioTexto !== "string" || typeof precioOriginalTexto !== "string") {
    return { ok: false, error: "No se reconoce el perfume. Recarga la página." };
  }

  const precio = leerPrecio(precioTexto);
  if ("error" in precio) return { ok: false, error: `Precio: ${precio.error}` };
  const original = leerPrecio(precioOriginalTexto);
  if ("error" in original) return { ok: false, error: `Precio anterior: ${original.error}` };

  if (original.valor !== null) {
    if (precio.valor === null) {
      return {
        ok: false,
        error: "Para poner un precio anterior, escribe primero el precio actual.",
      };
    }
    if (original.valor <= precio.valor) {
      return {
        ok: false,
        error: "El precio anterior debe ser mayor que el precio. Si no hay descuento, déjalo vacío.",
      };
    }
  }

  const resultado = await actualizarPerfume(idValido, {
    precio: precio.valor,
    precio_original: original.valor,
  });
  if (!resultado.ok) return { ok: false, error: resultado.error };

  refrescarTienda(idValido);
  return { ok: true, precio: precio.valor, precio_original: original.valor };
}
