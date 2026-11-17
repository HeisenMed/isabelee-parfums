"use client";

/**
 * src/components/admin/FormularioPerfume.tsx — Formulario para crear o
 * editar un perfume.
 *
 * QUÉ ES
 *   El formulario completo de /admin/perfumes/nuevo y /admin/perfumes/[id],
 *   dividido en secciones: Básico, Precio, Descripción, Notas y ocasiones,
 *   Visibilidad, y Fotos y video (solo lectura por ahora). Abajo lleva una
 *   barra fija con "Guardar" y "Cancelar".
 *
 * POR QUÉ EXISTE
 *   Es la pantalla con la que la dueña mantiene el catálogo sin tocar
 *   código ni el Dashboard de Supabase. Sirve igual para crear (sin
 *   `perfume`) que para editar (con `perfume`).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo montan src/app/admin/(panel)/perfumes/nuevo/page.tsx y
 *     src/app/admin/(panel)/perfumes/[id]/page.tsx, que le pasan el
 *     perfume (si existe), las sugerencias y si falta la migración n.º 3.
 *   - Envía a la Server Action guardarPerfume() de
 *     src/app/admin/perfumes/actions.ts con useActionState (hook de React
 *     19): devuelve el último resultado (`estado`), la función de envío y
 *     si sigue enviándose. La acción VALIDA TODO OTRA VEZ en el servidor;
 *     lo que este formulario comprueba es solo una ayuda.
 *   - Componentes propios: CampoEtiquetas (listas) e Interruptor (sí/no).
 *   - Estilos: recetas de src/components/admin/estilos.ts.
 *
 * CÓMO GUARDA LOS VALORES
 *   Todos los campos son "controlados": su valor vive en el estado
 *   `valores` de este componente. Dos motivos:
 *     1. React 19 vacía los campos no controlados al terminar una acción
 *        de formulario; controlados, conservan lo escrito (importante si
 *        el servidor devuelve un error).
 *     2. Permite saber si hay cambios sin guardar comparando `valores` con
 *        `guardados` (lo último que se guardó).
 *   Los campos que no son texto simple viajan en campos ocultos: los
 *   precios como dígitos sin puntos, las listas como JSON (JavaScript
 *   Object Notation) y los interruptores como "true"/"false".
 *
 * AVISO DE CAMBIOS SIN GUARDAR
 *   Si hay cambios pendientes: al cerrar o recargar la pestaña el navegador
 *   pregunta (evento beforeunload), y al pulsar un enlace interno se pide
 *   confirmación antes de salir.
 */
import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  guardarPerfume,
  type CampoPerfume,
  type EstadoPerfume,
} from "@/app/admin/perfumes/actions";
import CampoEtiquetas from "@/components/admin/CampoEtiquetas";
import Interruptor from "@/components/admin/Interruptor";
import {
  avisoError,
  avisoExito,
  avisoInfo,
  ayuda as claseAyuda,
  botonContorno,
  botonPrimarioCompacto,
  campoTexto,
  campoTextoError,
  errorCampo,
  etiqueta,
  tarjeta,
  tituloSeccion,
} from "@/components/admin/estilos";
import { conMiles, soloDigitos, tieneFoto } from "@/lib/admin-formato";
import type { SugerenciasPerfume } from "@/lib/admin-perfumes";
import { RUTA_PERFUMES } from "@/lib/admin-rutas";
import { PLACEHOLDER_IMAGE } from "@/lib/site";
import {
  BADGE_OTRO,
  BADGES_SUGERIDOS,
  CONCENTRACIONES_SUGERIDAS,
  GENEROS,
  type Perfume,
} from "@/types/perfume";

/** Los valores del formulario tal como se editan (todo texto o listas). */
type Valores = {
  nombre: string;
  marca: string;
  genero: string;
  concentracion: string;
  volumen: string;
  /** Solo dígitos, sin puntos: "189000". */
  precio: string;
  precio_original: string;
  descripcion: string;
  descripcion_olfativa: string;
  familia_olfativa: string;
  notas_salida: string[];
  notas_corazon: string[];
  notas_fondo: string[];
  ocasiones: string[];
  activo: boolean;
  destacado: boolean;
  agotado: boolean;
  /** Opción del desplegable: "", un badge sugerido o BADGE_OTRO. */
  badge: string;
  /** Texto libre cuando el desplegable está en "Otro…". */
  badge_otro: string;
};

/** Convierte un perfume (o la ausencia de él) en los valores iniciales. */
function valoresIniciales(perfume: Perfume | null): Valores {
  const badge = perfume?.badge ?? "";
  const esSugerido = BADGES_SUGERIDOS.includes(badge);
  return {
    nombre: perfume?.nombre ?? "",
    marca: perfume?.marca ?? "",
    genero: perfume?.genero ?? "",
    concentracion: perfume?.concentracion ?? "",
    volumen: perfume?.volumen ?? "",
    // Math.round: la columna admite decimales, el formulario no.
    precio:
      perfume?.precio != null ? String(Math.round(Number(perfume.precio))) : "",
    precio_original:
      perfume?.precio_original != null
        ? String(Math.round(Number(perfume.precio_original)))
        : "",
    descripcion: perfume?.descripcion ?? "",
    descripcion_olfativa: perfume?.descripcion_olfativa ?? "",
    familia_olfativa: perfume?.familia_olfativa ?? "",
    notas_salida: perfume?.notas?.salida ?? [],
    notas_corazon: perfume?.notas?.corazon ?? [],
    notas_fondo: perfume?.notas?.fondo ?? [],
    ocasiones: perfume?.ocasiones ?? [],
    // Un perfume nuevo nace activo: lo habitual es crearlo para venderlo.
    activo: perfume?.activo ?? true,
    destacado: perfume?.destacado === true,
    agotado: perfume?.agotado === true,
    badge: badge === "" ? "" : esSugerido ? badge : BADGE_OTRO,
    badge_otro: badge !== "" && !esSugerido ? badge : "",
  };
}

const ESTADO_INICIAL: EstadoPerfume = {
  ok: false,
  mensaje: null,
  errores: {},
  marca: 0,
};

/** Avisos que la página puede pedir mostrar al abrir (vienen de ?aviso=). */
const AVISOS_INICIALES: Record<string, string> = {
  creado: "Perfume creado",
  duplicado: "Copia creada. Está inactiva: revísala y actívala cuando esté lista.",
};

/** Milisegundos que permanece visible el aviso flotante. */
const DURACION_AVISO_MS = 5000;

type FormularioPerfumeProps = {
  /** Perfume a editar; null para crear uno nuevo. */
  perfume: Perfume | null;
  sugerencias: SugerenciasPerfume;
  /** true = faltan las columnas destacado/agotado (migración n.º 3). */
  migracionPendiente: boolean;
  /** Clave de AVISOS_INICIALES a mostrar al abrir, si la hay. */
  avisoInicial?: string;
};

export default function FormularioPerfume({
  perfume,
  sugerencias,
  migracionPendiente,
  avisoInicial,
}: FormularioPerfumeProps) {
  const [estado, enviar, enviando] = useActionState(
    guardarPerfume,
    ESTADO_INICIAL,
  );

  const [valores, setValores] = useState<Valores>(() =>
    valoresIniciales(perfume),
  );
  /** Copia de lo último guardado, para saber si hay cambios pendientes. */
  const [guardados, setGuardados] = useState<Valores>(() =>
    valoresIniciales(perfume),
  );
  /** Valores que se estaban enviando en el último "Guardar". */
  const [enviados, setEnviados] = useState<Valores | null>(null);
  /** Texto del aviso flotante, o null si no hay ninguno. */
  const [aviso, setAviso] = useState<string | null>(
    avisoInicial ? (AVISOS_INICIALES[avisoInicial] ?? null) : null,
  );

  // Prefijo único para los id de los campos (evita choques si algún día
  // hubiera dos formularios en la misma página).
  const uid = useId();
  const idDe = (campo: string) => `${uid}-${campo}`;

  const hayCambios = JSON.stringify(valores) !== JSON.stringify(guardados);

  /** Cambia un solo campo conservando el resto. */
  function cambiar<Clave extends keyof Valores>(clave: Clave, valor: Valores[Clave]) {
    setValores((actual) => ({ ...actual, [clave]: valor }));
  }

  // Cada respuesta del servidor trae una `marca` distinta. Cuando llega una
  // de éxito: lo enviado pasa a ser "lo guardado" y se muestra el aviso.
  useEffect(() => {
    if (estado.marca === 0 || !estado.ok) return;
    if (enviados) setGuardados(enviados);
    setAviso(estado.mensaje ?? "Cambios guardados");
    // Solo debe ejecutarse cuando llega una respuesta nueva.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.marca]);

  // El aviso flotante se retira solo al cabo de unos segundos.
  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  // Cambios sin guardar: avisar antes de salir.
  useEffect(() => {
    if (!hayCambios) return;

    // 1) Cerrar o recargar la pestaña: el navegador muestra su propio
    //    mensaje estándar (no se puede personalizar el texto).
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };

    // 2) Enlaces internos. Se escucha en `document` en fase de CAPTURA
    //    (tercer argumento `true`), es decir, antes de que el clic llegue
    //    al enlace: si la persona decide quedarse, se cancela ahí mismo.
    const alPulsarEnlace = (evento: MouseEvent) => {
      const destino = evento.target as HTMLElement | null;
      const vinculo = destino?.closest?.("a[href]") as HTMLAnchorElement | null;
      // Los enlaces que abren otra pestaña no hacen perder nada.
      if (!vinculo || vinculo.target === "_blank") return;
      const quiereSalir = window.confirm(
        "Tienes cambios sin guardar. ¿Salir de todas formas? Se perderán.",
      );
      if (!quiereSalir) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", alSalir);
    document.addEventListener("click", alPulsarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alPulsarEnlace, true);
    };
  }, [hayCambios]);

  /* ── Ayudas para dibujar campos ───────────────────────────────────── */

  const errores = estado.ok ? {} : estado.errores;

  /** Atributos comunes de un campo de texto: id, clase y enlaces de error. */
  function atributos(campo: CampoPerfume, conAyuda = false) {
    const error = errores[campo];
    const descritoPor = [
      conAyuda ? idDe(`${campo}-ayuda`) : null,
      error ? idDe(`${campo}-error`) : null,
    ]
      .filter(Boolean)
      .join(" ");
    return {
      id: idDe(campo),
      className: error ? campoTextoError : campoTexto,
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": descritoPor || undefined,
    };
  }

  /** Mensaje de error de un campo, enlazado a él con aria-describedby. */
  function errorDe(campo: CampoPerfume): ReactNode {
    const error = errores[campo];
    if (!error) return null;
    return (
      <p id={idDe(`${campo}-error`)} className={errorCampo}>
        {error}
      </p>
    );
  }

  /** Texto de ayuda de un campo. */
  function ayudaDe(campo: CampoPerfume, texto: string): ReactNode {
    return (
      <p id={idDe(`${campo}-ayuda`)} className={claseAyuda}>
        {texto}
      </p>
    );
  }

  /** Marca visual de campo obligatorio (el `required` ya lo anuncia). */
  const obligatorio = (
    <span aria-hidden="true" className="text-admin-error">
      {" "}
      *
    </span>
  );

  // Descuento que resulta de los dos precios, si lo hay.
  const precioNumero = valores.precio ? Number(valores.precio) : null;
  const anteriorNumero = valores.precio_original
    ? Number(valores.precio_original)
    : null;
  const descuento =
    precioNumero !== null && anteriorNumero !== null && anteriorNumero > precioNumero
      ? Math.round((1 - precioNumero / anteriorNumero) * 100)
      : null;

  // Concentraciones: las habituales primero, luego las ya usadas.
  const concentraciones = [
    ...new Set([...CONCENTRACIONES_SUGERIDAS, ...sugerencias.concentraciones]),
  ];

  const fotosGaleria = perfume?.imagenes?.filter(Boolean).length ?? 0;

  /** Fila de un interruptor con su título y su explicación. */
  function filaInterruptor(
    clave: "activo" | "destacado" | "agotado",
    titulo: string,
    explicacion: string,
    deshabilitado = false,
  ) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-admin-border py-3 last:border-b-0">
        <div>
          <p id={idDe(`${clave}-titulo`)} className="text-base font-medium text-admin-text">
            {titulo}
          </p>
          <p id={idDe(`${clave}-ayuda`)} className="mt-0.5 text-sm leading-relaxed text-admin-muted">
            {explicacion}
          </p>
        </div>
        <Interruptor
          name={clave}
          activado={valores[clave]}
          onCambio={(valor) => cambiar(clave, valor)}
          ariaLabelledBy={idDe(`${clave}-titulo`)}
          ariaDescribedBy={idDe(`${clave}-ayuda`)}
          disabled={deshabilitado}
        />
      </div>
    );
  }

  return (
    <form
      action={enviar}
      // Se anota qué se está enviando: si el servidor lo acepta, eso pasa
      // a ser "lo guardado" (aunque la persona siga escribiendo mientras).
      onSubmit={() => setEnviados(valores)}
      // noValidate: los mensajes de error los pone el servidor, en español
      // y junto a cada campo, en vez de los globos del navegador.
      noValidate
      className="space-y-6 pb-4"
    >
      <input type="hidden" name="id" value={perfume?.id ?? ""} />

      {!estado.ok && estado.mensaje && (
        <p role="alert" className={avisoError}>
          {estado.mensaje}
        </p>
      )}

      {migracionPendiente && (
        <p className={avisoInfo}>
          <strong className="font-semibold">Falta ejecutar la migración n.º 3.</strong>{" "}
          Hasta entonces los interruptores «Mostrar en la portada» y «Agotado»
          no se pueden guardar. El resto del formulario funciona con
          normalidad.
        </p>
      )}

      {/* ── 1. Básico ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-basico")}>
        <h2 id={idDe("sec-basico")} className={tituloSeccion}>
          Básico
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={idDe("nombre")} className={etiqueta}>
              Nombre{obligatorio}
            </label>
            <input
              {...atributos("nombre")}
              name="nombre"
              type="text"
              required
              value={valores.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              autoComplete="off"
            />
            {errorDe("nombre")}
          </div>

          <div>
            <label htmlFor={idDe("marca")} className={etiqueta}>
              Marca{obligatorio}
            </label>
            <input
              {...atributos("marca", true)}
              name="marca"
              type="text"
              required
              list={idDe("lista-marcas")}
              value={valores.marca}
              onChange={(e) => cambiar("marca", e.target.value)}
              autoComplete="off"
            />
            {/* <datalist>: sugerencias que el navegador ofrece al escribir.
                No obliga a elegir una: se puede escribir una marca nueva. */}
            <datalist id={idDe("lista-marcas")}>
              {sugerencias.marcas.map((marca) => (
                <option key={marca} value={marca} />
              ))}
            </datalist>
            {ayudaDe("marca", "Elige una marca existente o escribe una nueva.")}
            {errorDe("marca")}
          </div>

          <div>
            <label htmlFor={idDe("genero")} className={etiqueta}>
              Género{obligatorio}
            </label>
            <select
              {...atributos("genero")}
              name="genero"
              required
              value={valores.genero}
              onChange={(e) => cambiar("genero", e.target.value)}
            >
              <option value="">Elige uno…</option>
              {GENEROS.map((genero) => (
                <option key={genero} value={genero}>
                  {genero}
                </option>
              ))}
            </select>
            {errorDe("genero")}
          </div>

          <div>
            <label htmlFor={idDe("concentracion")} className={etiqueta}>
              Concentración
            </label>
            <input
              {...atributos("concentracion", true)}
              name="concentracion"
              type="text"
              list={idDe("lista-concentraciones")}
              value={valores.concentracion}
              onChange={(e) => cambiar("concentracion", e.target.value)}
              autoComplete="off"
            />
            <datalist id={idDe("lista-concentraciones")}>
              {concentraciones.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
            {ayudaDe("concentracion", "Ejemplo: EDP, EDT, Parfum.")}
            {errorDe("concentracion")}
          </div>

          <div>
            <label htmlFor={idDe("volumen")} className={etiqueta}>
              Volumen
            </label>
            <input
              {...atributos("volumen", true)}
              name="volumen"
              type="text"
              list={idDe("lista-volumenes")}
              value={valores.volumen}
              onChange={(e) => cambiar("volumen", e.target.value)}
              autoComplete="off"
            />
            <datalist id={idDe("lista-volumenes")}>
              {sugerencias.volumenes.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
            {ayudaDe("volumen", "Ejemplo: 100ml.")}
            {errorDe("volumen")}
          </div>
        </div>
      </section>

      {/* ── 2. Precio ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-precio")}>
        <h2 id={idDe("sec-precio")} className={tituloSeccion}>
          Precio
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={idDe("precio")} className={etiqueta}>
              Precio (pesos colombianos)
            </label>
            {/* El campo visible muestra puntos de millar ("189.000") y no
                tiene `name`: lo que viaja es el campo oculto, solo dígitos. */}
            <input type="hidden" name="precio" value={valores.precio} />
            <input
              {...atributos("precio", true)}
              type="text"
              inputMode="numeric" // teclado numérico en el móvil
              value={conMiles(valores.precio)}
              onChange={(e) => cambiar("precio", soloDigitos(e.target.value))}
              placeholder="Ejemplo: 189.000"
              autoComplete="off"
            />
            {ayudaDe(
              "precio",
              "Sin decimales. Si lo dejas vacío, la tienda muestra «Consultar precio».",
            )}
            {errorDe("precio")}
          </div>

          <div>
            <label htmlFor={idDe("precio_original")} className={etiqueta}>
              Precio anterior (opcional)
            </label>
            <input
              type="hidden"
              name="precio_original"
              value={valores.precio_original}
            />
            <input
              {...atributos("precio_original", true)}
              type="text"
              inputMode="numeric"
              value={conMiles(valores.precio_original)}
              onChange={(e) =>
                cambiar("precio_original", soloDigitos(e.target.value))
              }
              autoComplete="off"
            />
            {ayudaDe(
              "precio_original",
              descuento !== null
                ? `Se mostrará tachado: un descuento del ${descuento} %.`
                : "Solo si hay descuento: debe ser mayor que el precio. Se muestra tachado.",
            )}
            {errorDe("precio_original")}
          </div>
        </div>
      </section>

      {/* ── 3. Descripción ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-descripcion")}>
        <h2 id={idDe("sec-descripcion")} className={tituloSeccion}>
          Descripción
        </h2>
        <div className="mt-4 space-y-5">
          <div>
            <label htmlFor={idDe("descripcion")} className={etiqueta}>
              Descripción
            </label>
            <textarea
              {...atributos("descripcion", true)}
              name="descripcion"
              rows={4}
              value={valores.descripcion}
              onChange={(e) => cambiar("descripcion", e.target.value)}
            />
            {ayudaDe("descripcion", "Texto de venta, de dos a cuatro frases.")}
            {errorDe("descripcion")}
          </div>

          <div>
            <label htmlFor={idDe("descripcion_olfativa")} className={etiqueta}>
              Atmósfera olfativa
            </label>
            <textarea
              {...atributos("descripcion_olfativa", true)}
              name="descripcion_olfativa"
              rows={3}
              value={valores.descripcion_olfativa}
              onChange={(e) => cambiar("descripcion_olfativa", e.target.value)}
            />
            {ayudaDe(
              "descripcion_olfativa",
              "Una o dos frases sobre cómo huele. Aparece junto a las notas.",
            )}
            {errorDe("descripcion_olfativa")}
          </div>

          <div>
            <label htmlFor={idDe("familia_olfativa")} className={etiqueta}>
              Familia olfativa
            </label>
            <input
              {...atributos("familia_olfativa", true)}
              name="familia_olfativa"
              type="text"
              list={idDe("lista-familias")}
              value={valores.familia_olfativa}
              onChange={(e) => cambiar("familia_olfativa", e.target.value)}
              autoComplete="off"
            />
            <datalist id={idDe("lista-familias")}>
              {sugerencias.familias.map((valor) => (
                <option key={valor} value={valor} />
              ))}
            </datalist>
            {ayudaDe("familia_olfativa", "Ejemplo: Oriental Amaderada.")}
            {errorDe("familia_olfativa")}
          </div>
        </div>
      </section>

      {/* ── 4. Notas y ocasiones ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-notas")}>
        <h2 id={idDe("sec-notas")} className={tituloSeccion}>
          Notas y ocasiones
        </h2>
        <div className="mt-4 space-y-5">
          <CampoEtiquetas
            id={idDe("notas_salida")}
            name="notas_salida"
            titulo="Notas de salida"
            valores={valores.notas_salida}
            onCambio={(lista) => cambiar("notas_salida", lista)}
            placeholder="Ejemplo: bergamota"
            error={errores.notas}
          />
          <CampoEtiquetas
            id={idDe("notas_corazon")}
            name="notas_corazon"
            titulo="Notas de corazón"
            valores={valores.notas_corazon}
            onCambio={(lista) => cambiar("notas_corazon", lista)}
            placeholder="Ejemplo: jazmín"
          />
          <CampoEtiquetas
            id={idDe("notas_fondo")}
            name="notas_fondo"
            titulo="Notas de fondo"
            valores={valores.notas_fondo}
            onCambio={(lista) => cambiar("notas_fondo", lista)}
            placeholder="Ejemplo: vainilla"
          />
          <CampoEtiquetas
            id={idDe("ocasiones")}
            name="ocasiones"
            titulo="Ocasiones"
            valores={valores.ocasiones}
            onCambio={(lista) => cambiar("ocasiones", lista)}
            placeholder="Ejemplo: noche"
            error={errores.ocasiones}
          />
        </div>
      </section>

      {/* ── 5. Visibilidad ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-visibilidad")}>
        <h2 id={idDe("sec-visibilidad")} className={tituloSeccion}>
          Visibilidad
        </h2>
        <div className="mt-2">
          {filaInterruptor(
            "activo",
            "Activo",
            "Encendido: se ve en la tienda. Apagado: queda guardado, pero nadie lo ve.",
          )}
          {filaInterruptor(
            "destacado",
            "Mostrar en la portada",
            "Aparece en la sección «Destacados» de la página de inicio (se muestran hasta seis).",
            migracionPendiente,
          )}
          {filaInterruptor(
            "agotado",
            "Agotado",
            "Sigue visible con la etiqueta «Agotado», pasa al final del catálogo y su ficha invita a consultarlo por WhatsApp.",
            migracionPendiente,
          )}
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={idDe("badge")} className={etiqueta}>
              Badge (etiqueta sobre la foto)
            </label>
            <select
              {...atributos("badge")}
              name="badge"
              value={valores.badge}
              onChange={(e) => cambiar("badge", e.target.value)}
            >
              <option value="">(ninguno)</option>
              {BADGES_SUGERIDOS.map((badge) => (
                <option key={badge} value={badge}>
                  {badge}
                </option>
              ))}
              <option value={BADGE_OTRO}>Otro…</option>
            </select>
            {valores.badge !== BADGE_OTRO && errorDe("badge")}
          </div>

          {valores.badge === BADGE_OTRO && (
            <div>
              <label htmlFor={idDe("badge_otro")} className={etiqueta}>
                Texto del badge
              </label>
              <input
                id={idDe("badge_otro")}
                name="badge_otro"
                type="text"
                maxLength={30}
                value={valores.badge_otro}
                onChange={(e) => cambiar("badge_otro", e.target.value)}
                aria-invalid={errores.badge ? true : undefined}
                aria-describedby={errores.badge ? idDe("badge-error") : undefined}
                className={errores.badge ? campoTextoError : campoTexto}
                autoComplete="off"
              />
              {errorDe("badge")}
            </div>
          )}
        </div>
      </section>

      {/* ── 6. Fotos y video (solo lectura) ── */}
      <section className={tarjeta} aria-labelledby={idDe("sec-fotos")}>
        <h2 id={idDe("sec-fotos")} className={tituloSeccion}>
          Fotos y video
        </h2>
        <div className="mt-4 flex flex-wrap items-start gap-5">
          <Image
            src={perfume?.imagen || PLACEHOLDER_IMAGE}
            alt={
              perfume && tieneFoto(perfume.imagen)
                ? `Foto principal de ${perfume.nombre}`
                : "Imagen genérica: este perfume aún no tiene foto"
            }
            width={144}
            height={144}
            className="h-36 w-36 rounded-lg border border-admin-border bg-white object-contain p-2"
          />
          <div className="min-w-0 flex-1 space-y-2 text-sm text-admin-text">
            <p>
              Foto principal:{" "}
              <strong className="font-medium">
                {perfume && tieneFoto(perfume.imagen)
                  ? "sí"
                  : "todavía no (se muestra la imagen genérica)"}
              </strong>
            </p>
            <p>
              Fotos adicionales en la galería:{" "}
              <strong className="font-medium">{fotosGaleria}</strong>
            </p>
            <p>
              Video:{" "}
              <strong className="font-medium">
                {perfume?.video_url ? "sí" : "no"}
              </strong>
            </p>
            <p className={avisoInfo}>
              La gestión de fotos y video llega en la siguiente fase.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. Barra fija de guardado ──
          sticky bottom-0: se queda pegada al borde inferior de la ventana
          mientras se recorre el formulario, para no tener que bajar hasta
          el final para guardar. */}
      <div className="sticky bottom-0 z-10 -mx-5 border-t border-admin-border bg-admin-surface px-5 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-admin-muted">
            {enviando
              ? "Guardando…"
              : hayCambios
                ? "Hay cambios sin guardar."
                : perfume
                  ? "Sin cambios pendientes."
                  : "Rellena los campos y guarda."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={RUTA_PERFUMES} className={botonContorno}>
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={enviando}
              className={botonPrimarioCompacto}
            >
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {/* Aviso flotante ("toast"). role="status" lo anuncia sin interrumpir. */}
      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-5">
          <p
            role="status"
            className={`${avisoExito} pointer-events-auto shadow-[0_8px_24px_rgba(31,31,31,0.12)]`}
          >
            {aviso}
          </p>
        </div>
      )}
    </form>
  );
}
