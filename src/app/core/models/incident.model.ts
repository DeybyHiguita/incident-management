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
