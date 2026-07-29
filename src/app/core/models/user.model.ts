export type UserRole = 'ADMIN' | 'AGENT' | 'REQUESTER';

export interface User {
  readonly id: string;
  name: string;
  email: string;
  role: UserRole;
}
