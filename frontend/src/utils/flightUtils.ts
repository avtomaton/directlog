import { AppSettings } from '../types';

/**
 * Calculate approximate sunset and sunrise times for a given date and latitude
 * Uses simplified calculation - accurate enough for logbook purposes
 */
export const calculateSunTimes = (date: string, lat: number = 53.5, lon: number = -113.5): { sunrise: Date; sunset: Date } => {
  const d = new Date(date);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  
  // Approximate solar calculations
  const latRad = lat * Math.PI / 180;
  
  // Equation of time (simplified)
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  
  // Solar declination
  const declination = 23.45 * Math.sin((2 * Math.PI * (dayOfYear + 284)) / 365) * Math.PI / 180;
  
  // Hour angle for sunrise/sunset (civil twilight - 6 degrees below horizon)
  const hourAngle = Math.acos(
    Math.sin(-6 * Math.PI / 180) / (Math.cos(latRad) * Math.cos(declination)) - 
    Math.tan(latRad) * Math.tan(declination)
  ) * 180 / Math.PI;
  
  const sunriseHour = 12 - (hourAngle / 15) - (lon / 15) - (equationOfTime / 60);
  const sunsetHour = 12 + (hourAngle / 15) - (lon / 15) - (equationOfTime / 60);
  
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.floor((sunriseHour % 1) * 60), 0, 0);
  
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.floor((sunsetHour % 1) * 60), 0, 0);
  
  return { sunrise, sunset };
};

/**
 * Parse time offset string like "sunset+30" or "sunrise-60"
 */
export const parseTimeOffset = (spec: string, sunrise: Date, sunset: Date): Date => {
  if (spec.startsWith('sunset')) {
    const offset = parseInt(spec.replace('sunset', '')) || 0;
    return new Date(sunset.getTime() + offset * 60000);
  } else if (spec.startsWith('sunrise')) {
    const offset = parseInt(spec.replace('sunrise', '')) || 0;
    return new Date(sunrise.getTime() + offset * 60000);
  }
  return new Date();
};

/**
 * Calculate night time between start and shutdown times based on settings
 */
export const calculateNightTime = (
  date: string,
  start: string,
  shutdown: string,
  settings: AppSettings
): number => {
  if (!start || !shutdown) return 0;
  
  const { sunrise, sunset } = calculateSunTimes(date);
  const nightStart = parseTimeOffset(settings.nightStartTime, sunrise, sunset);
  const nightEnd = parseTimeOffset(settings.nightEndTime, sunrise, sunset);
  
  // Convert flight times to Date objects
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = shutdown.split(':').map(Number);
  
  const flightStart = new Date(date);
  flightStart.setHours(startH, startM, 0, 0);
  
  const flightEnd = new Date(date);
  flightEnd.setHours(endH, endM, 0, 0);
  
  // Handle overnight flights
  if (flightEnd < flightStart) {
    flightEnd.setDate(flightEnd.getDate() + 1);
  }
  
  // Calculate overlap between flight period and night period
  const overlapStart = new Date(Math.max(flightStart.getTime(), nightStart.getTime()));
  const overlapEnd = new Date(Math.min(flightEnd.getTime(), nightEnd.getTime()));
  
  if (overlapEnd <= overlapStart) return 0;
  
  const nightMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
  return nightMinutes / 60;
};

/**
 * Convert HH:MM string to decimal hours
 */
export const timeToHours = (time: string): number => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
};

/**
 * Calculate duration between two times (handles overnight)
 */
export const calculateDuration = (start: string, end: string): number => {
  const s = timeToHours(start);
  const e = timeToHours(end);
  if (e >= s) return e - s;
  return (e + 24) - s;
};

/**
 * Evaluate template calculation expression using a safe arithmetic-only parser.
 * Only supports: +, -, *, /, parentheses, numbers, and defined variable names.
 * No function calls, no object access, no string operations.
 */
export const evaluateCalculation = (expr: string, values: Record<string, number>): number => {
    try {
        // Tokenize: split into numbers, operators, parentheses, and identifiers
        const tokens: string[] = [];
        let i = 0;
        while (i < expr.length) {
            const ch = expr[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (/[0-9.]/.test(ch)) {
                let num = '';
                while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
                tokens.push(num);
            } else if (/[+\-*/()]/.test(ch)) {
                tokens.push(ch);
                i++;
            } else if (/[a-zA-Z_]/.test(ch)) {
                let ident = '';
                while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) ident += expr[i++];
                tokens.push(ident);
            } else {
                // Unknown character — invalid expression
                return 0;
            }
        }

        // Substitute known variables into numeric values
        const resolved: (number | string)[] = tokens.map(t => {
            if (values[t] !== undefined) return values[t];
            // Unknown identifiers become 0
            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) return 0;
            // Operators and parentheses stay as strings
            return t;
        });

        // Recursive descent parser for arithmetic expressions
        // Grammar: expr = term (('+' | '-') term)*
        //          term = factor (('*' | '/') factor)*
        //          factor = NUMBER | '(' expr ')' | '-' factor
        let pos = 0;

        const peek = (): (number | string) | undefined => resolved[pos];
        const consume = (): (number | string) => resolved[pos++];

        const parseExpr = (): number => {
            let result = parseTerm();
            while (peek() === '+' || peek() === '-') {
                const op = consume() as string;
                const right = parseTerm();
                result = op === '+' ? result + right : result - right;
            }
            return result;
        };

        const parseTerm = (): number => {
            let result = parseFactor();
            while (peek() === '*' || peek() === '/') {
                const op = consume() as string;
                const right = parseFactor();
                result = op === '*' ? result * right : (right !== 0 ? result / right : 0);
            }
            return result;
        };

        const parseFactor = (): number => {
            const token = peek();
            if (token === '-') {
                consume();
                return -parseFactor();
            }
            if (token === '(') {
                consume(); // '('
                const result = parseExpr();
                if (peek() === ')') consume(); // ')'
                return result;
            }
            const val = consume();
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
        };

        const result = parseExpr();
        return isNaN(result) ? 0 : result;
    } catch {
        return 0;
    }
};
