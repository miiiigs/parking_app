import { tokens } from './tokens';

/**
 * Reusable style utilities and helpers
 */

export const containerClasses = {
  // Safe area padding
  safeVertical: 'pt-safe pb-safe',
  safeHorizontal: 'px-safe',
  
  // Screen containers
  screenPadding: 'px-4 py-4',
  screenPaddingLg: 'px-5 py-5',
  
  // Card containers
  cardPadding: 'p-4',
  cardPaddingLg: 'p-5',
  
  // Centered content
  centerContent: 'items-center justify-center',
  centerHorizontal: 'items-center',
};

export const textClasses = {
  // Hero heading
  hero: 'text-2xl font-bold text-white',
  
  // Page heading
  heading: 'text-xl font-bold text-white',
  
  // Subheading
  subheading: 'text-lg font-bold text-white',
  
  // Body text
  body: 'text-base text-gray-100',
  bodyMuted: 'text-base text-gray-400',
  
  // Small text
  small: 'text-sm text-gray-300',
  smallMuted: 'text-sm text-gray-500',
  
  // Label
  label: 'text-xs font-semibold text-blue-400 uppercase tracking-wider',
};

export const buttonClasses = {
  // Base button
  base: 'rounded-4 py-4 px-4 items-center justify-center',
  
  // Primary button
  primary: 'bg-emerald-500 active:bg-emerald-600',
  
  // Secondary button
  secondary: 'bg-blue-950 border border-blue-800 active:bg-blue-900',
  
  // Tertiary button
  tertiary: 'bg-transparent active:bg-blue-950',
};

export const cardClasses = {
  // Base card
  base: 'rounded-2xl border border-blue-900 overflow-hidden',
  
  // Default card
  default: 'bg-blue-950 p-4',
  
  // Hero card (lighter)
  hero: 'bg-blue-900 p-5',
  
  // Compact card
  compact: 'bg-blue-950 p-3',
};

export const inputClasses = {
  base: 'rounded-xl border border-blue-800 px-4 py-3 bg-blue-900 text-white placeholder:text-gray-500',
};

export const flexClasses = {
  row: 'flex-row',
  col: 'flex-col',
  between: 'justify-between',
  center: 'justify-center items-center',
  start: 'justify-start items-start',
  end: 'justify-end items-end',
};

/**
 * Combine multiple className strings
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Create responsive class helper
 */
export function responsiveClass(mobile: string, tablet?: string, desktop?: string): string {
  return [mobile, tablet && `md:${tablet}`, desktop && `lg:${desktop}`].filter(Boolean).join(' ');
}

export const styles = {
  containers: containerClasses,
  text: textClasses,
  buttons: buttonClasses,
  cards: cardClasses,
  inputs: inputClasses,
  flex: flexClasses,
};
