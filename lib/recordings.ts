import type { CircuitKey } from './simulation';
export interface Recording {
  source: string;
  citation: string;
  download: string;
  unit?: string;
  timeUnit?: string;
  time?: number[];
  series?: { label: string; values: number[]; sem?: number[] }[];
  heatmap?: number[][];
  kind: string;
  condition: string;
  figure?: string;
  figurePage?: string;
  license: string;
  limitation?: string;
  processing?: string;
  file?: string;
}
export type Recordings = Record<CircuitKey, Recording>;
