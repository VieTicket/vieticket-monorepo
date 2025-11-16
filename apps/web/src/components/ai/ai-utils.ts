/**
 * Utility functions for AI personalization
 */

/**
 * Safely convert any date value to ISO string
 */
export function safeToISOString(dateValue: any): string {
  try {
    if (!dateValue) {
      return new Date().toISOString();
    }
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toISOString();
    }
    
    if (typeof dateValue === 'number') {
      return new Date(dateValue).toISOString();
    }
    
    // Fallback for any other type
    return new Date().toISOString();
  } catch (error) {
    console.error('Error converting date to ISO string:', error, dateValue);
    return new Date().toISOString();
  }
}

/**
 * Debug function to log event data types
 */
export function debugEventData(event: any) {
  console.log('Event debug info:', {
    id: event.id,
    name: event.name,
    startTimeType: typeof event.startTime,
    startTimeValue: event.startTime,
    startTimeConstructor: event.startTime?.constructor?.name,
    isDate: event.startTime instanceof Date,
  });
}