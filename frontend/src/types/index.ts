export interface Flight {
  id: number;
  date: string;
  aircraft: string;
  type: string;
  from: string;
  to: string;
  route?: string;
  air_time: number;
  pic: number;
  sic?: number;
  dual?: number;
  night?: number;
  actual_imc?: number;
  simulated?: number;
  ldg_day: number;
  ldg_night: number;
  approaches: Approach[];
  holds?: number;
  remarks?: string;
  created_at?: string;
}

export interface Approach {
  id?: number;
  type: 'ILS' | 'RNAV' | 'RNAV LPV' | 'RNAV LNAV' | 'VOR' | 'NDB' | 'LOC' | 'RNP';
  airport: string;
  runway?: string;
  actual: boolean;
  missed?: boolean;
}

export interface Aircraft {
  reg: string;
  type: string;
  class: 'SEL' | 'MEL' | 'SES' | 'MES';
  category: 'Aeroplane' | 'Helicopter';
  hp?: number;
  complex?: boolean;
  tailwheel?: boolean;
  equip?: string;
  home?: string;
  total_time?: number;
  last_flown?: string;
  notes?: string;
}

export interface CurrencyStatus {
  fiveYear: { current: boolean; lastFlight?: string; expires?: string };
  twoYear: { current: boolean; lastActivity?: string; due: string; type?: string };
  passengerDay: { current: boolean; count: number; required: number; lastDate?: string; expires?: string };
  passengerNight: { current: boolean; count: number; required: number; lastDate?: string; expires?: string };
  ifr: { current: boolean; lastTest?: string; testDue?: string; approaches: number; hours: number; approachesRequired: number; hoursRequired: number; inGracePeriod: boolean };
}

export interface CurrencyEvent {
  id: number;
  date: string;
  type: 'flight_review' | 'ipc' | 'ppc' | 'seminar' | 'self_paced' | 'exam';
  description: string;
  instructor?: string;
  expiry?: string;
}

export interface CSVMapping {
  date: string;
  aircraft: string;
  from: string;
  to: string;
  total: string;
  pic: string;
  night: string;
  actual: string;
  sim: string;
  dayLandings: string;
  nightLandings: string;
  remarks: string;
}
