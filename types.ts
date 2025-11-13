
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

export interface Articulo {
  id?: number;
  codigo_articulo: string;
  grupo: string;
  subgrupo: string;
  descripcion: string;
  en_stock: number;
  user_id?: string;
  created_at?: string;
}

export interface Reserva {
    id?: number;
    articulo_id: number;
    evento_key: string; // Formato: "fecha|salon|compania"
    cantidad_reservada: number;
    user_id?: string;
    created_at?: string;
}
