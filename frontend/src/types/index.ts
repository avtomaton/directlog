export interface Flight {
  id: number;
  date: string;
  aircraft: string;
  type: string;
  from: string;
  to: string;
  route?: string;
  
  // Block times
  start_time?: string;      // HH:MM
  shutdown_time?: string;   // HH:MM
  block_time?: number;
  
  // Core time
  air_time: number;
  pic: number;
  sic?: number;
  dual?: number;
  night?: number;
  
  // Instrument time
  actual_imc?: number;
  simulated?: number;
  hood?: number;
  approaches: Approach[];
  holds?: number;
  
  // Role time
  pilot_flying?: number;
  pilot_monitoring?: number;
  right_seat?: number;
  copilot?: number;
  instructor?: number;
  student?: number;
  
  // Cross country
  xc?: number;
  xc_over_50nm?: number;
  xc_over_100nm?: number;
  xc_over_300nm?: number;
  
  // Aircraft characteristics
  multi_engine?: number;
  multi_pilot?: number;
  complex?: number;
  high_performance?: number;
  tailwheel?: number;
  turbine?: number;
  jet?: number;
  
  // Landings
  ldg_day: number;
  ldg_night: number;
  ldg_full_stop?: number;
  ldg_touch_and_go?: number;
  ldg_soft_field?: number;
  ldg_short_field?: number;
  
  // Aircraft characteristic times
  multi_engine?: number;
  complex?: number;
  high_performance?: number;
  turbine?: number;
  jet?: number;
  
  // Special operations
  holds?: number;
  ifr?: boolean;
  vfr?: boolean;
  night_operation?: boolean;
  ems?: boolean;
  medevac?: boolean;
  search_and_rescue?: boolean;
  aerial_work?: boolean;
  training?: boolean;
  checkride?: boolean;
  flight_review?: boolean;
  ipc?: boolean;
  banner_towing?: number;
  glider_towing?: number;
  formation?: number;
  low_level?: number;
  mountain?: number;
  offshore?: number;
  bush?: number;
  combat?: number;
  sling_load?: number;
  hoist?: number;
  aerobatic_time?: number;
  
  // Crew
  pilot_in_command_name?: string;
  copilot_name?: string;
  instructor_name?: string;
  students?: string;
  additional_crew?: string;
  
  // Admin
  flight_number?: string;
  duty_start?: string;
  duty_end?: string;
  hobbs_start?: number;
  hobbs_end?: number;
  tach_start?: number;
  tach_end?: number;
  
  // Remarks and metadata
  remarks?: string;
  tags?: string[];
  created_at?: string;
}

export interface FlightTemplate {
  id: number;
  name: string;
  description?: string;
  visible_fields: string[];    // Which fields to show in UI
  calculations: {               // Field calculations (expressions)
    [field: string]: string;    // e.g. "ifr": "shutdown - start - 12"
  };
  defaults: {                   // Static default values
    [field: string]: any;
  };
  icon?: string;
  color?: string;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: 'time' | 'number' | 'boolean' | 'text' | 'select';
  category: string;
  description?: string;
  unit?: string;
  step?: number;
  default?: any;
  hidden?: boolean;
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
  defaultTemplateId: number | null;
  ifrDeductionMinutes: number; // Minutes to subtract for IFR time calculation
}
