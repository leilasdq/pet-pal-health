import { format as formatGregorian, parseISO as parseISOGregorian, differenceInDays as diffDaysGregorian } from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

type Language = 'en' | 'fa';

// Persian digits mapping
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert a number or string containing numbers to Persian digits
 */
export const toPersianDigits = (value: string | number): string => {
  return String(value).replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit)]);
};

/**
 * Convert a number or string to localized digits based on language
 */
export const toLocalizedDigits = (value: string | number, language: Language): string => {
  if (language === 'fa') {
    return toPersianDigits(value);
  }
  return String(value);
};

/**
 * Format a number with localized digits
 */
export const formatNumber = (value: number, language: Language): string => {
  return toLocalizedDigits(value, language);
};

/**
 * Format a date string or Date object based on the current language
 * Uses Jalali calendar for Persian (fa) and Gregorian for English (en)
 */
export const formatDate = (
  date: string | Date,
  formatStr: string,
  language: Language
): string => {
  const dateObj = typeof date === 'string' ? parseISOGregorian(date) : date;
  
  if (language === 'fa') {
    // Use Jalali calendar for Persian
    const formatted = formatJalali(dateObj, formatStr);
    return toPersianDigits(formatted);
  }
  
  // Use Gregorian calendar for English
  return formatGregorian(dateObj, formatStr);
};

/**
 * Format a date for display (e.g., "Jan 15, 2025" or "۲۵ دی ۱۴۰۳")
 */
export const formatDisplayDate = (
  date: string | Date,
  language: Language
): string => {
  return formatDate(date, 'd MMMM yyyy', language);
};

/**
 * Format a short date (e.g., "Jan 15" or "۲۵ دی")
 */
export const formatShortDate = (
  date: string | Date,
  language: Language
): string => {
  // Use full month name for Persian to avoid truncation issues
  const formatStr = language === 'fa' ? 'd MMMM' : 'MMM d';
  return formatDate(date, formatStr, language);
};

/**
 * Calculate age from birth date
 */
export const calculateAge = (
  birthDate: string,
  language: Language
): string => {
  const days = diffDaysGregorian(new Date(), parseISOGregorian(birthDate));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  
  if (language === 'fa') {
    const yearsStr = toPersianDigits(years);
    const monthsStr = toPersianDigits(months);
    if (years > 0) return `${yearsStr} سال و ${monthsStr} ماه`;
    return `${monthsStr} ماه`;
  }
  
  if (years > 0) return `${years}y ${months}m`;
  return `${months} months`;
};
