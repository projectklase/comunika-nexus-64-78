import { isValid, format } from 'date-fns';

export interface CalendarValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

export class CalendarValidator {
  /**
   * Validates and sanitizes a date parameter from URL or user input
   */
  static validateDate(dateInput: string | Date | null | undefined): CalendarValidationResult {
    if (!dateInput) {
      return {
        isValid: false,
        error: 'Date is required',
        sanitizedValue: new Date()
      };
    }

    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (!isValid(date)) {
        return {
          isValid: false,
          error: 'Invalid date format',
          sanitizedValue: new Date()
        };
      }

      // Check if date is reasonable (not too far in past/future)
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 10, 0, 1);
      const maxDate = new Date(now.getFullYear() + 10, 11, 31);

      if (date < minDate || date > maxDate) {
        return {
          isValid: false,
          error: 'Date is outside acceptable range',
          sanitizedValue: new Date()
        };
      }

      return {
        isValid: true,
        sanitizedValue: date
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Date parsing failed',
        sanitizedValue: new Date()
      };
    }
  }

  /**
   * Validates calendar view parameter
   */
  static validateView(view: string | null | undefined): CalendarValidationResult {
    const validViews = ['month', 'week'];
    
    if (!view) {
      return {
        isValid: true,
        sanitizedValue: 'month'
      };
    }

    if (!validViews.includes(view)) {
      return {
        isValid: false,
        error: 'Invalid view type',
        sanitizedValue: 'month'
      };
    }

    return {
      isValid: true,
      sanitizedValue: view as 'month' | 'week'
    };
  }

  /**
   * Validates user role for calendar access
   */
  static validateUserRole(role: string | undefined): CalendarValidationResult {
    const validRoles = ['aluno', 'professor', 'secretaria'];
    
    if (!role) {
      return {
        isValid: false,
        error: 'User role is required'
      };
    }

    if (!validRoles.includes(role)) {
      return {
        isValid: false,
        error: 'Invalid user role'
      };
    }

    return {
      isValid: true,
      sanitizedValue: role
    };
  }

  /**
   * Validates class ID parameter
   */
  static validateClassId(classId: string | null | undefined): CalendarValidationResult {
    if (!classId) {
      return {
        isValid: true,
        sanitizedValue: undefined
      };
    }

    if (classId === 'ALL_CLASSES') {
      return {
        isValid: true,
        sanitizedValue: classId
      };
    }

    // Basic UUID/ID format validation
    if (typeof classId !== 'string' || classId.length < 1 || classId.length > 100) {
      return {
        isValid: false,
        error: 'Invalid class ID format',
        sanitizedValue: undefined
      };
    }

    return {
      isValid: true,
      sanitizedValue: classId
    };
  }

  /**
   * Validates post ID parameter
   */
  static validatePostId(postId: string | null | undefined): CalendarValidationResult {
    if (!postId) {
      return {
        isValid: true,
        sanitizedValue: undefined
      };
    }

    // Basic UUID/ID format validation
    if (typeof postId !== 'string' || postId.length < 1 || postId.length > 100) {
      return {
        isValid: false,
        error: 'Invalid post ID format',
        sanitizedValue: undefined
      };
    }

    return {
      isValid: true,
      sanitizedValue: postId
    };
  }

  /**
   * Validates URL search parameters for calendar
   */
  static validateCalendarParams(searchParams: URLSearchParams): {
    date: Date;
    view: 'month' | 'week';
    classId?: string;
    postId?: string;
    errors: string[];
  } {
    const errors: string[] = [];
    
    const dateValidation = this.validateDate(searchParams.get('d'));
    const viewValidation = this.validateView(searchParams.get('v'));
    const classIdValidation = this.validateClassId(searchParams.get('classId'));
    const postIdValidation = this.validatePostId(searchParams.get('postId'));

    if (!dateValidation.isValid) {
      errors.push(dateValidation.error!);
    }

    if (!viewValidation.isValid) {
      errors.push(viewValidation.error!);
    }

    if (!classIdValidation.isValid) {
      errors.push(classIdValidation.error!);
    }

    if (!postIdValidation.isValid) {
      errors.push(postIdValidation.error!);
    }

    return {
      date: dateValidation.sanitizedValue!,
      view: viewValidation.sanitizedValue!,
      classId: classIdValidation.sanitizedValue,
      postId: postIdValidation.sanitizedValue,
      errors
    };
  }
}