/**
 * Utility Functions
 */

/**
 * Combine classNames - useful for conditional styling
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format time display
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'PHP'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Parse time string to seconds
 */
export function parseTimeString(timeStr: string): number {
  const parts = timeStr.split(':');
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds += parseInt(parts[0], 10) * 3600; // hours
    seconds += parseInt(parts[1], 10) * 60;   // minutes
    seconds += parseInt(parts[2], 10);        // seconds
  } else if (parts.length === 2) {
    seconds += parseInt(parts[0], 10) * 60;   // minutes
    seconds += parseInt(parts[1], 10);        // seconds
  }
  
  return seconds;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
