/**
 * src/app/admin/(panel)/page.tsx — Inicio del panel (ruta "/admin").
 *
 * QUÉ ES
 *   Lo primero que ve una administradora al entrar, organizado por TAREAS
 *   (Fase 5C), de arriba abajo:
 *     1. Saludo y tres acciones: "Agregar perfume", "Editar precios",
 *        "Ver tienda".
 *     2. Progreso: "Tu catálogo está listo al X %".
 *     3. Pendientes: qué falta y un enlace a la pantalla que lo resuelve.
 *     4. Últimos cambios: los 5 perfumes editados más recientemente.
 *     5. Enlaces a los módulos: Perfumes · Portada · Respaldo del catálogo.
 *
 * POR QUÉ EXISTE
 *   La dueña no es técnica: en vez de un índice de secciones, el inicio le
 *   dice qué hacer a continuación y la lleva directo. Las cifras salen de
 *   los datos reales; si no se pueden cargar, se dice, no se inventan.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro de src/app/admin/(panel)/layout.tsx. Aun así llama a
 *     comprobarAccesoAdmin() (memorizada por petición): una página que
 *     muestra datos no debe dar por hecho que el layout ya la protegió.
 *   - Todos los números salen de UNA lectura, listarPerfumesAdmin()
 *     (src/lib/admin-perfumes.ts), con los mismos criterios que los filtros
 *     de la lista de perfumes (ListaPerfumes): así "12 sin foto" coincide
 *     con lo que aparece al pulsar "Agregar fotos".
 *   - "Pendientes" es PendientesPanel (cliente: lee la fecha del último
 *     respaldo del navegador) y las horas relativas, TiempoRelativo; los
 *     dos evitan errores de hidratación (ver sus cabeceras).
 *
 * QUÉ SIGNIFICA "LISTO"
 *   Un perfume activo está listo cuando tiene precio Y foto propia (no la
 *   imagen genérica). X % = activos listos / activos.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PendientesPanel from "@/components/admin/PendientesPanel";
import TiempoRelativo from "@/components/admin/TiempoRelativo";
import { avisoError, botonContorno, botonPrimarioCompacto, enlace } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { tieneFoto } from "@/lib/admin-formato";
import { listarPerfumesAdmin } from "@/lib/admin-perfumes";
import {
  RUTA_PERFUME_NUEVO,
  RUTA_PERFUMES,
  RUTA_PORTADA,
  RUTA_PRECIOS,
  RUTA_RESPALDO,
  rutaPerfume,
} from "@/lib/admin-rutas";
import { PLACEHOLDER_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Cuántos perfumes muestra "Últimos cambios". */
const NUM_ULTIMOS = 5;

export default async function PanelPage() {
  const acceso = await comprobarAccesoAdmin();
  // El layout ya redirige o muestra un aviso en los demás casos.
  if (acceso.estado !== "ok") return null;

  const lista = await listarPerfumesAdmin();

  const saludo = (
    <>
      <h1 className="font-serif text-4xl font-semibold text-admin-text">Hola</h1>
      <p className="mt-2 text-base text-admin-muted">
        Entraste como{" "}
        <span className="break-all font-medium text-admin-text">{acceso.user.email}</span>.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={RUTA_PERFUME_NUEVO} className={botonPrimarioCompacto}>
          Agregar perfume
        </Link>
        <Link href={RUTA_PRECIOS} className={botonContorno}>
          Editar precios
        </Link>
        {/* rel="noopener": la pestaña nueva no puede controlar esta. */}
        <a href="/" target="_blank" rel="noopener" className={botonContorno}>
          Ver tienda
        </a>
      </div>
    </>
  );

  if (!lista.ok) {
    return (
      <>
        {saludo}
        <p role="alert" className={`${avisoError} mt-8`}>
          {lista.error}
        </p>
      </>
    );
  }

  const perfumes = lista.perfumes;
  const activos = perfumes.filter((p) => p.activo);
  const listos = activos.filter((p) => p.precio !== null && tieneFoto(p.imagen));
  const porcentaje = activos.length === 0 ? 0 : Math.round((listos.length / activos.length) * 100);

  // Mismos criterios que los filtros de ListaPerfumes (sobre TODOS los
  // perfumes, activos o no), para que los números coincidan al pulsar.
  const conteos = {
    sinPrecio: perfumes.filter((p) => p.precio === null).length,
    sinFoto: perfumes.filter((p) => !tieneFoto(p.imagen)).length,
    ocultos: perfumes.filter((p) => !p.activo).length,
    agotados: perfumes.filter((p) => p.agotado === true).length,
  };

  // Los 5 editados más recientemente (updated_at lo pone la base de datos).
  const ultimos = [...perfumes]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, NUM_ULTIMOS);

  return (
    <>
      {saludo}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* 2. Progreso */}
        <section
          aria-labelledby="progreso-titulo"
          className="rounded-lg border border-admin-border bg-admin-surface p-5 sm:p-6 lg:col-span-2"
        >
          <h2 id="progreso-titulo" className="font-serif text-2xl font-semibold text-admin-text">
            Tu catálogo está listo al {porcentaje} %
          </h2>
          {/* role="progressbar" con sus valores: los lectores de pantalla
              lo anuncian como "barra de progreso, 37 %". */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-labelledby="progreso-titulo"
            className="mt-4 h-3 overflow-hidden rounded-full border border-admin-border bg-admin-bg"
          >
            <div className="h-full rounded-full bg-admin-accent" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-3 text-sm text-admin-muted">
            {listos.length} de {activos.length} perfumes a la venta están listos: tienen precio y
            foto propia (no la imagen genérica).
          </p>
        </section>

        {/* 3. Pendientes */}
        <PendientesPanel conteos={conteos} />

        {/* 4. Últimos cambios */}
        <section
          aria-labelledby="ultimos-titulo"
          className="rounded-lg border border-admin-border bg-admin-surface p-5 sm:p-6"
        >
          <h2 id="ultimos-titulo" className="font-serif text-2xl font-semibold text-admin-text">
            Últimos cambios
          </h2>
          {ultimos.length === 0 ? (
            <p className="mt-3 text-admin-muted">Todavía no hay perfumes.</p>
          ) : (
            <ul className="mt-3 divide-y divide-admin-border">
              {ultimos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <Image
                    src={p.imagen || PLACEHOLDER_IMAGE}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded border border-admin-border bg-white object-contain p-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-admin-text">{p.nombre}</p>
                    <p className="truncate text-sm text-admin-muted">
                      {p.marca} · <TiempoRelativo iso={p.updated_at} />
                    </p>
                  </div>
                  <Link
                    href={rutaPerfume(p.id)}
                    className={`${enlace} inline-flex min-h-11 items-center text-sm`}
                    aria-label={`Editar ${p.nombre}`}
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 5. Módulos */}
      <nav
        aria-label="Módulos del panel"
        className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-admin-border pt-5 text-sm"
      >
        <span className="text-admin-muted">Ir a:</span>
        <Link href={RUTA_PERFUMES} className={`${enlace} inline-flex min-h-11 items-center`}>
          Perfumes
        </Link>
        <Link href={RUTA_PORTADA} className={`${enlace} inline-flex min-h-11 items-center`}>
          Portada
        </Link>
        <Link href={RUTA_RESPALDO} className={`${enlace} inline-flex min-h-11 items-center`}>
          Respaldo del catálogo
        </Link>
      </nav>
    </>
  );
}
