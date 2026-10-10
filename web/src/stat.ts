// Mirrors schema/stat.schema.json; schema.test.ts validates typed samples against it.

export type Mode = 'fake' | 'real';

export interface Term {
  id: string;
  label: string;
}

export interface Stat {
  id: string;
  mode: Mode;
  text: string;
  punchline?: string;
  subject: { kind: 'team' | 'position' | 'archetype' | 'player'; label: string };
  conditions: Term[];
  metric: Term;
  numbers: {
    sampleSize: number;
    record?: { wins: number; losses: number; ties?: number };
    percentage?: number;
    count?: number;
  };
  seasons?: { from: number; to: number };
  query?: string;
  seed?: string;
}
