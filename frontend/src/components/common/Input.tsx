import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label for the input field
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  /**
   * Whether the input is in an error state
   */
  isError?: boolean;
  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display on the right side
   */
  rightIcon?: React.ReactNode;
  /**
   * Size of the input
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Input component with consistent styling and validation states
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   type="email"
 * />
 *
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password is required"
 *   isError
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isError = false,
      leftIcon,
      rightIcon,
      size = 'md',
      className = '',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = React.useId();

    // Base styles for input
    const baseStyles =
      'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2';

    // State styles
    const stateStyles = isError || error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600';

    // Disabled styles
    const disabledStyles = disabled
      ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800'
      : 'bg-white dark:bg-gray-900';

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Adjust padding for icons
    const iconPaddingStyles = {
      left: leftIcon ? 'pl-10' : '',
      right: rightIcon ? 'pr-10' : '',
    };

    // Combine input styles
    const inputClasses = `${baseStyles} ${stateStyles} ${disabledStyles} ${sizeStyles[size]} ${iconPaddingStyles.left} ${iconPaddingStyles.right} ${className}`.trim();

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            disabled={disabled}
            aria-invalid={isError || !!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea component with consistent styling
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label for the textarea
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below the textarea
   */
  helperText?: string;
  /**
   * Whether the textarea is in an error state
   */
  isError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      isError = false,
      className = '',
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = React.useId();

    // Base styles
    const baseStyles =
      'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 resize-vertical';

    // State styles
    const stateStyles = isError || error
      ? 'border-error-300 focus:border-error-500 focus:ring-error-500/20 dark:border-error-700'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600';

    // Disabled styles
    const disabledStyles = disabled
      ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800'
      : 'bg-white dark:bg-gray-900';

    // Combine styles
    const textareaClasses = `${baseStyles} ${stateStyles} ${disabledStyles} px-4 py-2 text-base ${className}`.trim();

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          disabled={disabled}
          rows={rows}
          aria-invalid={isError || !!error}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {/* Error Message */}
        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
