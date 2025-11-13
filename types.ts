
export interface Registro {
  id?: number;
  fecha: string;
  beo?: string;
  salon: string;
  compania: string;
  item: string;
  tipo: string;
  valor: number;
  cantidad: number;
  total: number;
  user_id?: string;
  created_at?: string;
}

export type ChartType = 'salon' | 'compania' | 'tipo' | 'fecha';
