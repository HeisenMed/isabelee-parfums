/**
 * src/app/admin/(panel)/perfumes/precios/page.tsx — Edición rápida de
 * precios (ruta "/admin/perfumes/precios").
 *
 * QUÉ ES
 *   La pantalla para poner o corregir los precios de muchos perfumes
 *   seguidos, sin abrir cada ficha.
 *
 * POR QUÉ EXISTE
 *   Es la tarea pendiente más grande del catálogo (ningún perfume tiene
 *   precio). El inicio del panel enlaza aquí desde "Poner precios".
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Componente de servidor: comprueba el acceso y lee todos los perfumes
 *     con listarPerfumesAdmin() (src/lib/admin-perfumes.ts). Pasa al
 *     navegador solo los datos que hacen falta.
 *   - El trabajo lo hace EditorPrecios (src/components/admin/), que guarda
 *     fila por fila con la Server Action actualizarPrecios().
 *   - "precios" es una carpeta fija: tiene prioridad sobre la ruta dinámica
 *     hermana [id], así que /admin/perfumes/precios nunca se toma por un id.
 */
import type { Metadata } from "next";
import Link from "next/link";
import EditorPrecios from "@/components/admin/EditorPrecios";
import { avisoError, enlace } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { listarPerfumesAdmin } from "@/lib/admin-perfumes";
import { RUTA_PERFUMES } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Editar precios",
};

export default async function PreciosPage() {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  const lista = await listarPerfumesAdmin();

  return (
    <>
      <p className="text-sm">
        <Link href={RUTA_PERFUMES} className={enlace}>
          Volver a perfumes
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-admin-text">Editar precios</h1>
      <p className="mt-2 max-w-2xl text-base text-admin-muted">
        Escribe el precio en pesos, sin decimales, y pulsa Enter para pasar al siguiente. El
        precio anterior es opcional: solo si hay descuento (debe ser mayor que el precio).
      </p>

      <div className="mt-6">
        {lista.ok ? (
          <EditorPrecios
            perfumes={lista.perfumes.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              marca: p.marca,
              volumen: p.volumen,
              imagen: p.imagen,
              precio: p.precio === null ? null : Number(p.precio),
              precio_original: p.precio_original === null ? null : Number(p.precio_original),
            }))}
          />
        ) : (
          <p role="alert" className={avisoError}>
            {lista.error}
          </p>
        )}
      </div>
    </>
  );
}
