import { User } from '../models/user.model';

export const MOCK_USERS: readonly User[] = [
  { id: 'u-001', name: 'Ana Torres', email: 'ana.torres@example.com', role: 'ADMIN' },
  { id: 'u-002', name: 'Luis Gómez', email: 'luis.gomez@example.com', role: 'AGENT' },
  { id: 'u-003', name: 'Marta Ruiz', email: 'marta.ruiz@example.com', role: 'AGENT' },
  { id: 'u-004', name: 'Carlos Peña', email: 'carlos.pena@example.com', role: 'REQUESTER' },
  { id: 'u-005', name: 'Sofía Reyes', email: 'sofia.reyes@example.com', role: 'REQUESTER' },
];
