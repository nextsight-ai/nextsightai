import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Label for the select field
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below the select
   */
  helperText?: string;
  /**
   * Whether the select is in an error state
   */
  isError?: boolean;
  /**
   * Options for the select dropdown
   */
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  /**
   * Placeholder option text
   */
  placeholder?: string;
  /**
   * Size of the select
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Select component with consistent styling and validation states
 *
 * @example
 * ```tsx
 * <Select
 *   label="Environment"
 *   options={[
 *     { value: 'dev', label: 'Development' },
 *     { value: 'prod', label: 'Production' }
 *   ]}
 *   placeholder="Select environment"
 * />
 * ```
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      isError = false,
      options,
      placeholder,
      size = 'md',
      className = '',
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const selectId = React.useId();

    // Base styles for select - glassy design
    const baseStyles =
      'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-1 appearance-none bg-no-repeat bg-right backdrop-blur-xl text-white';

    // State styles - glass styling
    const stateStyles = isError || error
      ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20 bg-red-500/5'
      : 'border-white/20 focus:border-white/40 focus:ring-white/10 bg-white/5';

    // Disabled styles
    const disabledStyles = disabled
      ? 'bg-white/5 cursor-not-allowed opacity-50'
      : '';

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 pr-8 text-sm',
      md: 'px-4 py-2 pr-10 text-base',
      lg: 'px-5 py-3 pr-12 text-lg',
    };

    // Combine select styles
    const selectClasses = `${baseStyles} ${stateStyles} ${disabledStyles} ${sizeStyles[size]} ${className}`.trim();

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectClasses}
            disabled={disabled}
            aria-invalid={isError || !!error}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg
              className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1.5 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && (
          <p
            id={`${selectId}-helper`}
            className="mt-1.5 text-sm text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
