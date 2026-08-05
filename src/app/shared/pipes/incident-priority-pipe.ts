import { Pipe, PipeTransform } from '@angular/core';
import { IncidentPriority } from '../../core/models/incident.model';

/** Etiqueta legible para cada prioridad del dominio. */
const PRIORITY_LABELS: Readonly<Record<IncidentPriority, string>> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

/** Texto para prioridades no reconocidas (datos corruptos o de una versión futura). */
const UNKNOWN_LABEL = 'Sin definir';

/**
 * Traduce el código de prioridad del modelo a la etiqueta que ve el usuario.
 *
 * Vive en `shared/` y no en la tarjeta porque cualquier vista que muestre
 * una prioridad (listado, detalle, filtros, informes) necesita exactamente
 * la misma traducción.
 *
 * @example
 * {{ incident.priority | incidentPriority }}  <!-- HIGH -> Alta -->
 */
@Pipe({
  name: 'incidentPriority',
})
export class IncidentPriorityPipe implements PipeTransform {
  transform(value: IncidentPriority | string | null | undefined): string {
    if (value === null || value === undefined) {
      return UNKNOWN_LABEL;
    }

    // `??` cubre cualquier cadena fuera del tipo IncidentPriority: el modelo
    // dice que no puede pasar, pero los datos pueden venir de una API.
    return PRIORITY_LABELS[value as IncidentPriority] ?? UNKNOWN_LABEL;
  }
}
