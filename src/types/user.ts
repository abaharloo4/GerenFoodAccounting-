export type UserRole = 'accountant' | 'manager';
export type ShiftAssignment = 'morning' | 'evening' | 'both';

export interface User {
  id: number;
  phone_number: string;
  full_name: string;
  role: UserRole;
  shift_assignment?: ShiftAssignment;
  is_active: number;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}
