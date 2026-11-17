/**
 * src/components/ui/Stars.tsx — Puntuación con estrellas.
 *
 * QUÉ ES
 *   Cinco estrellas SVG, rellenas en dorado según una puntuación de 0 a 5.
 *   Admite decimales (4.3 rellena la quinta estrella parcialmente).
 *
 * POR QUÉ EXISTE
 *   Las estrellas se dibujan con SVG y no con el carácter "★", porque
 *   CLAUDE.md §10.3 prohíbe símbolos Unicode en la interfaz.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/producto/[id]/page.tsx: una vez para el promedio del
 *     perfume y una por cada reseña.
 *   - El valor siempre se calcula a partir de las reseñas reales; este
 *     componente solo lo dibuja (CLAUDE.md §5).
 *   - Componente de servidor: es solo marcado.
 */

/** Silueta de una estrella de cinco puntas en una caja de 24×24. */
const STAR_PATH =
  "M12 2l2.9 6.26 6.6.76-4.9 4.6 1.3 6.68L12 17.1 6.1 20.3l1.3-6.68-4.9-4.6 6.6-.76L12 2z";

type StarsProps = {
  /** Puntuación de 0 a 5. */
  value: number;
  /** Clases de tamaño para cada estrella (por defecto 16px). */
  className?: string;
};

export default function Stars({ value, className = "h-4 w-4" }: StarsProps) {
  const rounded = Math.round(value * 10) / 10;

  return (
    // role="img" + aria-label: un lector de pantalla dice "4,3 de 5
    // estrellas" en lugar de leer cinco dibujos sueltos.
    <span
      role="img"
      aria-label={`${rounded.toLocaleString("es-CO")} de 5 estrellas`}
      className="inline-flex gap-0.5"
    >
      {[0, 1, 2, 3, 4].map((index) => {
        // Cuánto de ESTA estrella va relleno: entre 0 y 1.
        const fill = Math.min(1, Math.max(0, value - index));
        return (
          <span key={index} className={`relative ${className}`}>
            {/* Estrella de fondo, apagada */}
            <svg viewBox="0 0 24 24" className="h-full w-full fill-gold/20">
              <path d={STAR_PATH} />
            </svg>
            {/* Estrella dorada encima, recortada al porcentaje relleno */}
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <svg viewBox="0 0 24 24" className={`fill-gold ${className}`}>
                <path d={STAR_PATH} />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}
