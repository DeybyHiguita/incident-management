import { Pipe, PipeTransform } from '@angular/core';

/** Unidades de mayor a menor, con su duración en milisegundos. */
const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** Texto para entradas que no representan una fecha válida. */
const INVALID_OUTPUT = '';

/**
 * Expresa una fecha como tiempo transcurrido en lenguaje natural
 * ("hace 3 días", "ayer", "hace 2 horas").
 *
 * Es un pipe **puro**: para una misma entrada devuelve siempre la misma
 * salida y no toca el valor recibido. Por eso el instante de referencia se
 * puede pasar como argumento (`now`) en vez de leer el reloj por dentro:
 * así el resultado es reproducible y verificable en pruebas.
 *
 * @example
 * {{ incident.createdAt | relativeTime }}       <!-- hace 3 días -->
 * {{ incident.createdAt | relativeTime: ref }}  <!-- respecto a otro instante -->
 */
@Pipe({
  name: 'relativeTime',
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, now: number | Date = Date.now()): string {
    const timestamp = toTimestamp(value);
    const reference = toTimestamp(now);

    if (timestamp === null || reference === null) {
      return INVALID_OUTPUT;
    }

    const elapsed = timestamp - reference;
    const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

    for (const [unit, unitMs] of UNITS) {
      if (Math.abs(elapsed) >= unitMs) {
        // Trunca hacia cero para que "hace 47 horas" sea "hace 1 día", no 2.
        return formatter.format(Math.trunc(elapsed / unitMs), unit);
      }
    }

    // Por debajo del minuto no tiene sentido dar un número.
    return 'hace unos segundos';
  }
}

/** Normaliza cualquier entrada admitida a milisegundos, o `null` si no es válida. */
function toTimestamp(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}
