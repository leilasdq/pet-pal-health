import { format as formatGregorian, parseISO as parseISOGregorian, differenceInDays as diffDaysGregorian } from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

type Language = 'en' | 'fa';

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
    return formatJalali(dateObj, formatStr);
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
  return formatDate(date, 'MMM d', language);
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
    if (years > 0) return `${years} سال و ${months} ماه`;
    return `${months} ماه`;
  }
  
  if (years > 0) return `${years}y ${months}m`;
  return `${months} months`;
};
