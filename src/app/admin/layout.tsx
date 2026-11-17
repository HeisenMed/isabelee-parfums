/**
 * src/app/admin/layout.tsx — Marco común de todo el panel (/admin/...).
 *
 * QUÉ ES
 *   El layout que envuelve tanto las pantallas de acceso (login, recuperar,
 *   crear contraseña) como el panel ya protegido. Solo aporta lo que ambas
 *   partes comparten: el tema claro y los metadatos.
 *
 * POR QUÉ EXISTE
 *   Para declarar UNA vez tres cosas que valen para cualquier página bajo
 *   /admin, presente o futura:
 *     1. El tema claro (fondo cálido, texto oscuro), distinto del de la
 *        tienda.
 *     2. Que los buscadores NO indexen el panel (robots).
 *     3. La plantilla del título de pestaña: "Ingresar | Panel".
 *   No estaba en la estructura sugerida; se añadió para no repetir esto en
 *   los layouts de (acceso) y (panel), donde olvidar el `robots` en uno
 *   sería fácil.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro del layout raíz (src/app/layout.tsx), que aporta
 *     <html>, <body> y las fuentes Cormorant Garamond y Jost.
 *   - Dentro de él van los dos grupos de rutas (carpetas entre paréntesis,
 *     que no aparecen en la URL):
 *       (acceso)/  tarjeta centrada para login y contraseñas
 *       (panel)/   barra superior y contenido, solo para administradores
 *   - Colores: tokens `admin-*` de tailwind.config.ts.
 *   - Este layout NO protege nada: de eso se encargan src/middleware.ts y
 *     src/app/admin/(panel)/layout.tsx.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Panel",
    // Cada página pone su título y aquí se completa: "Ingresar | Panel".
    template: "%s | Panel",
  },
  // Pide a Google y demás buscadores que no muestren estas páginas ni
  // sigan sus enlaces.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // [color-scheme:light]: globals.css declara todo el sitio como oscuro
    //   (color-scheme: dark en <html>) para que el navegador pinte en
    //   oscuro los controles nativos. Aquí se invierte solo para el panel:
    //   campos, casillas y desplegables salen claros. La propiedad se
    //   hereda, así que basta con ponerla en este envoltorio.
    // [&_:focus-visible]:outline-admin-gold-text: el anillo de foco global
    //   es dorado claro, pensado para fondo oscuro; sobre blanco casi no se
    //   vería. Dentro del panel se cambia al dorado oscuro (5,79:1).
    <div className="min-h-screen bg-admin-bg font-sans text-admin-text [color-scheme:light] [&_:focus-visible]:outline-admin-gold-text">
      {children}
    </div>
  );
}
