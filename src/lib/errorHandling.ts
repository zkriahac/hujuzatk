// ============= ERROR TYPES =============

export interface ValidationError {
  field: string;
  message: string;
}

export interface AppError {
  type: 'VALIDATION' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'NOT_FOUND' | 'CONFLICT' | 'NETWORK' | 'UNKNOWN';
  message: string;
  details?: Record<string, any>;
  statusCode?: number;
}

// ============= ERROR PARSING =============

export function parseApolloError(error: any): AppError {
  if (!error.graphQLErrors || error.graphQLErrors.length === 0) {
    // Network error
    if (error.networkError) {
      return {
        type: 'NETWORK',
        message: 'Network error. Please check your connection.',
        statusCode: 'statusCode' in error.networkError ? error.networkError.statusCode : undefined,
      };
    }

    return {
      type: 'UNKNOWN',
      message: 'An unexpected error occurred',
    };
  }

  const graphQLError = error.graphQLErrors[0];
  const message = graphQLError.message;
  const code = graphQLError.extensions?.code as string;

  if (code === 'AUTHENTICATION_ERROR' || message.includes('Authentication required')) {
    return {
      type: 'AUTHENTICATION',
      message: 'Please log in to continue',
    };
  }

  if (code === 'FORBIDDEN' || code === 'AUTHORIZATION_ERROR' || message.includes('Unauthorized')) {
    return {
      type: 'AUTHORIZATION',
      message: 'You do not have permission to perform this action',
    };
  }

  if (code === 'NOT_FOUND' || message.includes('not found')) {
    return {
      type: 'NOT_FOUND',
      message: 'The requested resource was not found',
    };
  }

  if (code === 'BAD_USER_INPUT' || message.includes('validation') || message.includes('must be')) {
    return {
      type: 'VALIDATION',
      message,
    };
  }

  if (code === 'CONFLICT' || message.includes('already')) {
    return {
      type: 'CONFLICT',
      message,
    };
  }

  return {
    type: 'UNKNOWN',
    message,
    details: graphQLError.extensions,
  };
}

// ============= VALIDATION =============

export interface ValidationRules {
  [field: string]: ((value: any) => string | null)[];
}

export function validateBookingSEarch(data: any, rules: ValidationRules): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, validators] of Object.entries(rules)) {
    const value = data[field];

    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors.push({ field, message: error });
        break; // Stop at first error for this field
      }
    }
  }

  return errors;
}

// ============= COMMON VALIDATORS =============

export const Validators = {
  required: (fieldName: string = 'This field') => (value: any) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return null;
    return emailRegex.test(value) ? null : 'Invalid email address';
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    return value.length >= min ? null : `Must be at least ${min} characters`;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    return value.length <= max ? null : `Must be at most ${max} characters`;
  },

  phone: (value: string) => {
    if (!value) return null;
    const phoneRegex = /^[+\d\s\-()]+$/;
    return phoneRegex.test(value) ? null : 'Invalid phone number';
  },

  positive: (value: number) => {
    if (value === null || value === undefined) return null;
    return value > 0 ? null : 'Must be a positive number';
  },

  dateRange: (startField: string, endField: string) => (data: any) => {
    const start = new Date(data[startField]);
    const end = new Date(data[endField]);
    return start < end ? null : 'End date must be after start date';
  },

  password: (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(value)) return 'Password must contain lowercase letters';
    if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letters';
    if (!/[0-9]/.test(value)) return 'Password must contain numbers';
    if (!/[!@#$%^&*]/.test(value)) return 'Password must contain special characters (!@#$%^&*)';
    return null;
  },
};

// ============= BOOKING VALIDATION =============

export const BookingValidationRules: ValidationRules = {
  guestName: [
    Validators.required('Guest name'),
    Validators.minLength(2),
    Validators.maxLength(100),
  ],
  guestEmail: [Validators.email],
  guestPhone: [Validators.phone],
  room: [Validators.required('Room')],
  checkIn: [Validators.required('Check-in date')],
  checkOut: [Validators.required('Check-out date')],
  nightPrice: [
    Validators.required('Night price'),
    Validators.positive,
  ],
  deposit: [Validators.required('Deposit'), Validators.positive],
};

export function validateBooking(booking: any): ValidationError[] {
  const errors = validateBookingSEarch(booking, BookingValidationRules);

  // Custom validation: check-out after check-in
  if (booking.checkIn && booking.checkOut) {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    if (checkOut <= checkIn) {
      errors.push({
        field: 'checkOut',
        message: 'Check-out date must be after check-in date',
      });
    }
  }

  // Custom validation: deposit <= total price
  if (booking.nightPrice && booking.deposit) {
    if (booking.checkIn && booking.checkOut) {
      const nights = Math.ceil(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const totalPrice = booking.nightPrice * nights;
      if (booking.deposit > totalPrice) {
        errors.push({
          field: 'deposit',
          message: 'Deposit cannot exceed total booking price',
        });
      }
    }
  }

  return errors;
}

// ============= FORM ERROR HELPER =============

export function getFieldError(
  errors: ValidationError[] | undefined,
  fieldName: string
): string | undefined {
  return errors?.find((e) => e.field === fieldName)?.message;
}

export function hasErrors(errors: ValidationError[] | undefined): boolean {
  return errors !== undefined && errors.length > 0;
}

// ============= ERROR MESSAGES =============

export const ErrorMessages = {
  NETWORK: 'Unable to connect to server. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  DUPLICATE: 'This record already exists.',
  INVALID_INPUT: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  UNKNOWN: 'An unexpected error occurred.',
};

// ============= RETRY LOGIC =============

export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}
