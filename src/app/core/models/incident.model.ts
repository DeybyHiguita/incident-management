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
  createdAt: string;
  updatedAt: string;
}
