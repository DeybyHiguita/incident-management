/**
 * Configuración de **producción**.
 *
 * Sustituye a `environment.ts` durante `ng build` gracias a
 * `fileReplacements`. La API real vive en otro origen, y el backend
 * simulado se queda fuera.
 */
export const environment = {
  production: true,

  /**
   * Base de la API real.
   *
   * Se deja como ruta relativa a propósito: así el mismo paquete sirve
   * para cualquier dominio y es el servidor (o un proxy) quien decide a
   * dónde van las peticiones. Poner aquí un dominio obligaría a compilar
   * una versión por entorno.
   */
  apiBaseUrl: '/api',

  useFakeBackend: false,

  sessionDurationMs: 8 * 60 * 60 * 1000,
};
