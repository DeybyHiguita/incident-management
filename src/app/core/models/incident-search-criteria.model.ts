import { Incident, IncidentPriority, IncidentStatus } from './incident.model';

export class IncidentSearchCriteria {
  constructor(
    public readonly searchTerm: string = '',
    public readonly status?: IncidentStatus,
    public readonly priority?: IncidentPriority,
    public readonly category?: string,
  ) {}

  matches(incident: Incident): boolean {
    return (
      this.matchesSearchTerm(incident) &&
      this.matchesStatus(incident) &&
      this.matchesPriority(incident) &&
      this.matchesCategory(incident)
    );
  }

  private matchesSearchTerm(incident: Incident): boolean {
    if (!this.searchTerm) {
      return true;
    }

    const term = this.searchTerm.toLowerCase();
    return (
      incident.title.toLowerCase().includes(term) ||
      incident.description.toLowerCase().includes(term)
    );
  }

  private matchesStatus(incident: Incident): boolean {
    return !this.status || incident.status === this.status;
  }

  private matchesPriority(incident: Incident): boolean {
    return !this.priority || incident.priority === this.priority;
  }

  private matchesCategory(incident: Incident): boolean {
    return !this.category || incident.category === this.category;
  }
}
