export type ShiftType = 'morning' | 'evening';
export type ShiftStatus = 'open' | 'submitted' | 'locked';

export interface PosEntry {
  id?: number;
  pos_label: string;
  amount: number;
}

export interface NamedEntry {
  id?: number;
  description: string;
  amount: number;
}

export interface ShiftData {
  id?: number;
  shift_date_shamsi: string;
  shift_type: ShiftType;
  accountant_id: number;
  accountant_name?: string;
  system_sales: number;
  cash_amount: number;
  status: ShiftStatus;
  notes?: string;
  pos_entries: PosEntry[];
  credit_entries: NamedEntry[];
  card_to_card_entries: NamedEntry[];
  shortage_entries: NamedEntry[];
  surplus_entries: NamedEntry[];
  created_at?: string;
  updated_at?: string;
  locked_by?: number;
  locked_at?: string;
}

export interface ShiftSavePayload {
  shift_date_shamsi: string;
  shift_type: ShiftType;
  system_sales: number;
  cash_amount: number;
  notes?: string;
  accountant_id?: number;
  pos_entries: { pos_label: string; amount: number }[];
  credit_entries: { description: string; amount: number }[];
  card_to_card_entries: { description: string; amount: number }[];
  shortage_entries: { description: string; amount: number }[];
  surplus_entries: { description: string; amount: number }[];
}

export interface ShiftCalculationResult {
  totalPos: number;
  cashAmount: number;
  totalCredit: number;
  totalCardToCard: number;
  totalKnownShortage: number;
  totalKnownSurplus: number;
  totalAccounted: number;
  unknownRemainder: number;
}

