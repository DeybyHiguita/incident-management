/**
 * Configuración de **desarrollo**.
 *
 * Es el archivo que se usa por defecto. En producción, el build lo
 * sustituye por `environment.production.ts` mediante `fileReplacements`
 * en `angular.json`.
 *
 * Aquí no va nada secreto: todo lo que se compile en el paquete acaba en
 * el navegador y cualquiera puede leerlo. Las claves de verdad viven en el
 * servidor.
 */
export const environment = {
  production: false,

  /** Base de la API. En desarrollo la atiende el backend simulado. */
  apiBaseUrl: '/api',

  /** Con `true`, el interceptor que finge el servidor entra en la cadena. */
  useFakeBackend: true,

  /** Duración de la sesión simulada, en milisegundos. */
  sessionDurationMs: 8 * 60 * 60 * 1000,
};
