/**
 * src/app/api/buscar/route.ts — Lista compacta de perfumes (GET /api/buscar).
 *
 * QUÉ ES
 *   Un Route Handler (una ruta que responde con datos en lugar de una
 *   página) que devuelve, en formato JSON (JavaScript Object Notation),
 *   una lista ligera de TODOS los perfumes activos: solo id, nombre, marca,
 *   imagen, precio y agotado.
 *
 * POR QUÉ EXISTE
 *   Lo necesitan dos piezas que se ejecutan en el navegador:
 *     - el buscador del Header (src/components/search/SearchOverlay.tsx),
 *       que filtra mientras se escribe sin pedir nada al servidor por cada
 *       tecla;
 *     - el carrito (src/components/cart/CartDrawer.tsx), que al abrirse
 *       comprueba si los precios cambiaron o si algún perfume se agotó o
 *       dejó de venderse.
 *   Con unos cientos de perfumes, la lista pesa pocos KB: es más rápido y
 *   simple descargarla una vez que consultar la base de datos a cada tecla.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lee con getPerfumes() de src/lib/perfumes.ts: el cliente PÚBLICO de
 *     Supabase, que solo ve perfumes activos (RLS — Row Level Security —
 *     lo impone en la base de datos).
 *   - revalidate = 60: la respuesta se guarda en caché y se regenera como
 *     mucho una vez por minuto, igual que la portada y las fichas. Miles de
 *     visitas buscando no generan miles de consultas.
 *   - Las Server Actions del panel llaman a revalidatePath("/catalogo") y
 *     otras rutas, pero NO a esta: un cambio de precio puede tardar hasta
 *     un minuto en verse aquí.
 *
 * SEGURIDAD
 *   Esta ruta no recibe ningún parámetro: siempre devuelve la misma lista.
 *   El texto que escribe la persona se compara en su navegador, sobre la
 *   lista ya descargada; nunca llega a la base de datos. No hay, por tanto,
 *   riesgo de inyección (SQL injection: colar órdenes en una consulta a
 *   través de un texto). Solo expone datos que ya son públicos en el
 *   catálogo.
 */
import { NextResponse } from "next/server";
import { getPerfumes } from "@/lib/perfumes";

/** Segundos que la respuesta permanece en caché antes de regenerarse. */
export const revalidate = 60;

/** Lo que se envía de cada perfume (lo mínimo para buscar y para el carrito). */
export type PerfumeBuscable = {
  id: number;
  nombre: string;
  marca: string;
  imagen: string;
  precio: number | null;
  agotado: boolean;
};

export async function GET() {
  // Orden alfabético por marca: es como el buscador muestra los resultados.
  const perfumes = await getPerfumes({ orden: "marca" });

  const lista: PerfumeBuscable[] = perfumes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    marca: p.marca,
    imagen: p.imagen,
    // La columna es NUMERIC: según el cliente puede llegar como texto.
    precio: p.precio === null ? null : Number(p.precio),
    // `=== true`: si faltara la migración n.º 3, el campo no existiría.
    agotado: p.agotado === true,
  }));

  return NextResponse.json(lista);
}
