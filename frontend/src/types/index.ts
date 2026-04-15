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

export type Regulation = 'CARs' | 'FAA' | 'EASA';

export interface AppSettings {
  regulation: Regulation;
  homeBase: string;
  nightDefinition: 'sunset_30' | 'custom';
  nightStartTime: string; // e.g. 'sunset+30' meaning sunset + 30 min
  nightEndTime: string;   // e.g. 'sunrise-30' meaning sunrise - 30 min
  nightLandingStart: string; // e.g. 'sunset+60' meaning sunset + 1h
  nightLandingEnd: string;   // e.g. 'sunrise-60' meaning sunrise - 1h
  totalTimeDecimals: number; // 1, 2, or 3
  totalTimeUnit: 'hours' | 'minutes'; // how to display totals
}
