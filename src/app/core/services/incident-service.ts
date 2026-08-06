import { Injectable, computed, signal } from '@angular/core';
import { Incident, IncidentDraft } from '../models/incident.model';
import { IncidentSearchCriteria } from '../models/incident-search-criteria.model';
import { MOCK_INCIDENTS } from '../mocks/incidents.mock';

/**
 * Fuente única de verdad de las incidencias.
 *
 * Es el **único** punto del sistema que sabe de dónde salen los datos. Hoy
 * vienen de una constante en memoria; el día que vengan de una API, cambia
 * este archivo y ningún componente se entera.
 *
 * Ver `docs/dia-09-responsabilidad-del-servicio.md`.
 */
@Injectable({
  providedIn: 'root',
})
export class IncidentService {
  /**
   * Colección interna. Privada y de escritura exclusiva del servicio: nadie
   * de fuera puede reemplazarla ni modificarla.
   */
  private readonly collection = signal<readonly Incident[]>(MOCK_INCIDENTS);

  /**
   * Vista reactiva de solo lectura. Los componentes leen de aquí y se
   * actualizan solos, pero no disponen de `set` ni de `update`.
   */
  readonly incidents = this.collection.asReadonly();

  // --- Indicadores derivados -----------------------------------------------
  //
  // Son `computed`, no campos: se calculan a partir de la colección y se
  // recalculan solos cuando cambia. Guardarlos en un `signal` aparte
  // obligaría a acordarse de actualizarlos en cada alta y cada baja, que es
  // exactamente el tipo de estado que se desincroniza.

  /** Número total de incidencias registradas. */
  readonly totalCount = computed(() => this.collection().length);

  /** Incidencias con prioridad crítica, sin importar su estado. */
  readonly criticalCount = computed(
    () => this.collection().filter((incident) => incident.priority === 'CRITICAL').length,
  );

  /** Incidencias en estado `OPEN`, es decir, aún sin atender. */
  readonly openCount = computed(
    () => this.collection().filter((incident) => incident.status === 'OPEN').length,
  );

  // --- Consulta ------------------------------------------------------------

  /** Todas las incidencias, en un arreglo nuevo que el llamante puede tratar como suyo. */
  getAll(): readonly Incident[] {
    return [...this.collection()];
  }

  /** Busca por identificador. `undefined` si no existe. */
  getById(id: string): Incident | undefined {
    return this.collection().find((incident) => incident.id === id);
  }

  /** Filtra aplicando los criterios de búsqueda del dominio (Día 2). */
  search(criteria: IncidentSearchCriteria): readonly Incident[] {
    return this.collection().filter((incident) => criteria.matches(incident));
  }

  // --- Escritura -----------------------------------------------------------

  /**
   * Registra una incidencia nueva y devuelve la versión ya completa.
   *
   * El servicio decide el `id`, las marcas de tiempo y el estado inicial:
   * son reglas del dominio, no decisiones de quien rellena el formulario.
   */
  create(draft: IncidentDraft): Incident {
    const now = new Date().toISOString();
    const incident: Incident = {
      ...draft,
      id: this.nextId(),
      status: draft.status ?? 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    // Arreglo nuevo, nunca `push`: así la señal notifica el cambio.
    this.collection.update((current) => [...current, incident]);

    return incident;
  }

  /** Elimina por identificador. Devuelve `false` si no había nada que eliminar. */
  remove(id: string): boolean {
    const existed = this.collection().some((incident) => incident.id === id);

    if (existed) {
      this.collection.update((current) => current.filter((incident) => incident.id !== id));
    }

    return existed;
  }

  /** Vuelve al conjunto de datos inicial. */
  reset(): void {
    this.collection.set(MOCK_INCIDENTS);
  }

  /** `true` si la colección sigue siendo exactamente la inicial. */
  isPristine(): boolean {
    return this.collection() === MOCK_INCIDENTS;
  }

  // --- Interno -------------------------------------------------------------

  /** Siguiente identificador correlativo (`inc-006`, `inc-007`, …). */
  private nextId(): string {
    const highest = this.collection().reduce((max, incident) => {
      const value = Number.parseInt(incident.id.replace(/\D/g, ''), 10);
      return Number.isNaN(value) ? max : Math.max(max, value);
    }, 0);

    return `inc-${String(highest + 1).padStart(3, '0')}`;
  }
}
