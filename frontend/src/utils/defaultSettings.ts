import { AppSettings } from '../types';

export const defaultSettings: AppSettings = {
  regulation: 'CARs',
  homeBase: '',
  nightDefinition: 'sunset_30',
  nightStartTime: 'sunset+30',
  nightEndTime: 'sunrise-30',
  nightLandingStart: 'sunset+60',
  nightLandingEnd: 'sunrise-60',
  totalTimeDecimals: 1,
  totalTimeUnit: 'hours',
  defaultTemplateId: null,
  ifrDeductionMinutes: 12,
};
