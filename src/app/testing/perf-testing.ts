import { ComponentFixture } from '@angular/core/testing';

/**
 * Utilidades para **medir** el rendimiento de la detección de cambios, no
 * para suponerlo.
 *
 * Angular publica en `window.ng` un gancho interno, `ɵsetProfiler`, que avisa
 * de cada evento del ciclo de detección. Es lo que usan las herramientas de
 * desarrollo por dentro, y sirve para contar desde una prueba.
 *
 * Por qué este camino y no otro:
 *
 * - `ng.profiler` (el de las guías antiguas) **ya no existe** en Angular 20.
 * - `ng.enableProfiling()` sí existe, pero escribe con `console.timeStamp()`,
 *   que solo pinta una pista en el panel Rendimiento de Chrome. **No deja
 *   nada legible desde código**: comprobado, no añade ni una entrada a
 *   `performance.getEntriesByType('measure')`.
 *
 * La advertencia de rigor: la `ɵ` significa que es API interna y puede
 * cambiar entre versiones. Es aceptable **en pruebas** —si cambia, falla aquí
 * y se ve— pero no debe usarse en el código de la aplicación.
 */

/**
 * Eventos del profiler que interesan, con su código numérico.
 *
 * El que de verdad importa para `OnPush` es `TemplateUpdate`: significa que
 * Angular **volvió a evaluar una plantilla**, que es justo el trabajo que
 * `OnPush` pretende evitar.
 */
export const PROFILER_EVENT = {
  /** Se creó una plantilla (solo al montar). */
  TemplateCreate: 0,
  /** Se **reevaluó** una plantilla. Ésta es la cifra a vigilar. */
  TemplateUpdate: 2,
  /** Se ejecutó un hook de ciclo de vida. */
  LifecycleHook: 4,
  /** Se disparó un `output`. */
  Output: 6,
  /** Empezó un ciclo de detección completo. */
  ChangeDetection: 12,
  /** Se entró a comprobar un componente. */
  Component: 18,
  /** Se actualizaron host bindings. */
  HostBindings: 24,
} as const;

interface ProfilerCounts {
  /** Cuántas veces se reevaluó alguna plantilla. */
  templateUpdates: number;
  /** Cuántos ciclos de detección se ejecutaron. */
  changeDetections: number;
  /** Cuántos hooks de ciclo de vida se llamaron. */
  lifecycleHooks: number;
  /** Conteo en crudo por código de evento, para casos que no cubren los de arriba. */
  raw: Record<number, number>;
}

type SetProfiler = (fn: ((event: number) => void) | null) => void;

function getSetProfiler(): SetProfiler {
  const ng = (globalThis as unknown as Record<string, Record<string, unknown> | undefined>)['ng'];
  const setProfiler = ng?.['ɵsetProfiler'] as SetProfiler | undefined;

  if (!setProfiler) {
    throw new Error(
      'ng.ɵsetProfiler no está disponible. Solo existe en compilaciones de ' +
        'desarrollo; en producción las herramientas de depuración se eliminan.',
    );
  }
  return setProfiler;
}

/**
 * Ejecuta `accion` con el profiler activo y devuelve lo que ocurrió dentro.
 *
 * ```ts
 * const conteo = measureChangeDetection(() => {
 *   for (let i = 0; i < 10; i++) fixture.detectChanges();
 * });
 * expect(conteo.templateUpdates).toBe(0);
 * ```
 */
export function measureChangeDetection(accion: () => void): ProfilerCounts {
  const setProfiler = getSetProfiler();
  const raw: Record<number, number> = {};

  setProfiler((event: number) => {
    raw[event] = (raw[event] ?? 0) + 1;
  });

  try {
    accion();
  } finally {
    // En `finally` a propósito: si la acción lanza, el profiler debe quedar
    // desconectado igualmente. Si no, contaminaría todas las pruebas
    // siguientes del archivo.
    setProfiler(null);
  }

  return {
    templateUpdates: raw[PROFILER_EVENT.TemplateUpdate] ?? 0,
    changeDetections: raw[PROFILER_EVENT.ChangeDetection] ?? 0,
    lifecycleHooks: raw[PROFILER_EVENT.LifecycleHook] ?? 0,
    raw,
  };
}

/**
 * Atajo para el caso habitual: cuántas veces se reevaluó la plantilla en N
 * ciclos de detección **sin que nada haya cambiado**.
 *
 * Con `OnPush` y señales bien usadas la respuesta debe ser **0**. Cualquier
 * otro número significa que algo está haciendo trabajo que nadie pidió.
 */
export function countTemplateUpdates(
  fixture: ComponentFixture<unknown>,
  cycles = 10,
): number {
  return measureChangeDetection(() => {
    for (let i = 0; i < cycles; i++) {
      fixture.detectChanges();
    }
  }).templateUpdates;
}
