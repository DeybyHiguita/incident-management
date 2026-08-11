export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Incident {
  readonly id: string;
  title: string;
  description: string;
  category: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  reporterId: string;
  assignedAgentId?: string;
  /** Etiquetas libres para clasificar la incidencia. */
  tags?: readonly string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Datos que aporta quien registra una incidencia.
 *
 * El `id`, las marcas de tiempo y el estado inicial no se piden: los asigna
 * el servicio, que es el único dueño de esas reglas.
 */
export type IncidentDraft = Omit<Incident, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
  readonly status?: IncidentStatus;
};

/**
 * Campos que se pueden modificar de una incidencia ya registrada.
 *
 * Quedan fuera `id` y `createdAt` —no cambian nunca— y `updatedAt`, que lo
 * pone el servicio.
 */
export type IncidentChanges = Partial<Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>>;
