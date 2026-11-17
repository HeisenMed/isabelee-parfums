/**
 * src/app/(tienda)/layout.tsx — Marco de la tienda pública.
 *
 * QUÉ ES
 *   El layout que comparten las páginas que ve un cliente: la portada
 *   ("/"), el catálogo ("/catalogo") y la ficha ("/producto/123"). Pone el
 *   fondo oscuro, el Header, el Footer, el botón flotante de WhatsApp y el
 *   modal de bienvenida alrededor de cada página.
 *
 * POR QUÉ EXISTE
 *   Antes todo esto vivía en el layout raíz (src/app/layout.tsx) y lo
 *   heredaba cualquier ruta. Al llegar el panel de administración hacía
 *   falta que /admin NO mostrara el header de la tienda ni el botón de
 *   WhatsApp. La solución de Next.js son los "grupos de rutas": una carpeta
 *   con el nombre entre paréntesis —(tienda)— agrupa páginas bajo un mismo
 *   layout SIN aparecer en la URL. Por eso src/app/(tienda)/catalogo/ sigue
 *   respondiendo en /catalogo, no en /tienda/catalogo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro del layout raíz, que aporta <html>, <body>, las
 *     fuentes y el CSS global.
 *   - Monta los componentes presentes en toda la tienda:
 *       <Header />          src/components/layout/Header.tsx
 *       <Footer />          src/components/layout/Footer.tsx
 *       <WhatsAppButton />  src/components/ui/WhatsAppButton.tsx
 *       <WelcomeModal />    src/components/ui/WelcomeModal.tsx
 *       <ShareButton />     src/components/ui/ShareButton.tsx (compartir + QR)
 *       <CartProvider>      src/components/cart/CartProvider.tsx (carrito,
 *                           envuelve todo; dibuja también su cajón)
 *   - IMPORTANTE (caché): ni este archivo ni las páginas de la tienda deben
 *     importar src/lib/supabase-server.ts. Ese cliente lee cookies, y leer
 *     cookies obliga a Next a generar la página en cada visita; se perdería
 *     el ISR (Incremental Static Regeneration: páginas guardadas en caché
 *     que se regeneran cada cierto tiempo, aquí `revalidate = 60`). La
 *     tienda lee el catálogo con el cliente público de src/lib/supabase.ts.
 *   - El middleware (src/middleware.ts) tampoco se ejecuta en estas rutas.
 *   - Es un componente de servidor; los componentes interactivos que monta
 *     llevan su propio "use client".
 */
import CartProvider from "@/components/cart/CartProvider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ShareButton from "@/components/ui/ShareButton";
import WelcomeModal from "@/components/ui/WelcomeModal";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

export default function TiendaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Envoltorio de la tienda (antes estas clases iban en <body>). Sus
    // colores salen de las variables de tema: oscuro en noche, marfil en
    // día. min-h-screen: el fondo cubre la ventana aunque la página sea
    // corta.
    // CartProvider (Fase 5A): comparte el carrito con el Header, las
    // tarjetas y la ficha, y dibuja el cajón del carrito y su aviso.
    <CartProvider>
    <div className="min-h-screen bg-dark-deep text-ink">
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
      <ShareButton />
      <WelcomeModal />
    </div>
    </CartProvider>
  );
}
