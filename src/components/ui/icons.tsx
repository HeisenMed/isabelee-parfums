/**
 * src/components/ui/icons.tsx — Íconos SVG compartidos.
 *
 * QUÉ ES
 *   Pequeños componentes React que devuelven un <svg>. Cada uno acepta las
 *   mismas props que un <svg> normal (className, aria-hidden, etc.).
 *
 * POR QUÉ EXISTE
 *   CLAUDE.md §10.3 prohíbe los emojis en la interfaz: todo ícono debe ser
 *   SVG o CSS. Además, el logo de WhatsApp aparecía copiado cuatro veces en
 *   el HTML antiguo; aquí se define una sola vez y se reutiliza.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - WhatsAppIcon: botón flotante, modal de bienvenida, footer y sección
 *     de contacto.
 *   - BottleIcon: modal de bienvenida y tarjetas de categoría (como imagen
 *     provisional mientras no haya fotos).
 *   - SearchIcon, BagIcon, CloseIcon, ChevronDownIcon, MailIcon y los de
 *     redes sociales: Header, Hero, Newsletter y Footer.
 *   - EyeIcon y EyeOffIcon: botón de mostrar/ocultar contraseña del panel
 *     (src/components/admin/CampoContrasena.tsx).
 *   - SunIcon / MoonIcon: ThemeToggle (Header). ShareIcon, CopyIcon y
 *     DownloadIcon: ShareButton. SealIcon, GiftIcon y TruckIcon: sección
 *     "Así llega tu fragancia" de la portada (Fase 4).
 *   - BagPlusIcon, PlusIcon, MinusIcon y TrashIcon: carrito (Fase 5A,
 *     src/components/cart/). SearchIcon también lo usa el buscador.
 *   - El tamaño y el color NO se fijan aquí: los decide quien lo usa con
 *     clases de Tailwind (por ejemplo "h-5 w-5 text-gold-ink").
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Props comunes de los íconos de trazo (línea fina, sin relleno). */
const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Logotipo de WhatsApp (relleno con el color de texto actual). */
export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.5 12.5 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374A9.86 9.86 0 012.167 11.9C2.168 6.45 6.604 2.015 12.054 2.015c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.878-9.885 9.878zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Silueta de frasco de perfume en trazo fino (la misma del modal antiguo). */
export function BottleIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 32 44"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="12.5" y="2" width="7" height="6.5" rx="1.5" />
      <path d="M14 8.5v3" />
      <path d="M18 8.5v3" />
      <path d="M14 11.5c0 2.6-6 4.1-6 8.6v17a3 3 0 003 3h10a3 3 0 003-3v-17c0-4.5-6-6-6-8.6" />
      <path d="M12.5 26h7" />
    </svg>
  );
}

/** Lupa (búsqueda). */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

/** Bolsa de compra (carrito). */
export function BagIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

/** Aspa para cerrar menús y modales. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** Flecha hacia abajo (indicador de scroll del hero). */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Sobre de correo (newsletter). */
export function MailIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

/** Instagram. */
export function InstagramIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".5" fill="currentColor" />
    </svg>
  );
}

/** Facebook. */
export function FacebookIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

/** TikTok. */
export function TikTokIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.77 0 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 106.33 6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
    </svg>
  );
}

/** Ojo abierto: "mostrar contraseña" (panel de administración). */
export function EyeIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Ojo tachado: "ocultar contraseña" (panel de administración). */
export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0112 5c6.4 0 10 7 10 7a17.6 17.6 0 01-3.2 4.1M6.6 6.6A17.3 17.3 0 002 12s3.6 7 10 7a10.7 10.7 0 005.4-1.4" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" />
    </svg>
  );
}

/* ── Fase 4: tema, compartir y confianza ───────────────────────────── */

/** Sol: "activar modo día" (ThemeToggle). */
export function SunIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/** Luna: "activar modo noche" (ThemeToggle). */
export function MoonIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z" />
    </svg>
  );
}

/** Compartir: tres nodos unidos (botón flotante de compartir). */
export function ShareIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}

/** Copiar: dos hojas superpuestas. */
export function CopyIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h8" />
    </svg>
  );
}

/** Descargar: flecha hacia una bandeja. */
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

/** Sello con visto bueno: "Fragancias originales". */
export function SealIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </svg>
  );
}

/** Caja de regalo: "Empaque cuidado". */
export function GiftIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8v13" />
      <path d="M12 8S10.5 3.5 8 4.2C6 4.8 7 8 12 8zM12 8s1.5-4.5 4-3.8C18 4.8 17 8 12 8z" />
    </svg>
  );
}

/** Camión: "Envíos a toda Colombia". */
export function TruckIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

/* ── Fase 5A: carrito ──────────────────────────────────────────────── */

/** Bolsa con un "+": "Agregar al carrito" (tarjeta de producto). */
export function BagPlusIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
      <path d="M12 11.5v5M9.5 14h5" />
    </svg>
  );
}

/** Signo más (aumentar cantidad). */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Signo menos (disminuir cantidad). */
export function MinusIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

/** Papelera (quitar del carrito). */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}
