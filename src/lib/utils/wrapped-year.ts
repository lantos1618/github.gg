/**
 * Get the default year for GitHub Wrapped.
 *
 * Wrapped is always for the PREVIOUS year since we're wrapping up
 * what happened last year. E.g., in January 2026, we show 2025 Wrapped.
 */
export function getWrappedYear(): number {
  return new Date().getFullYear() - 1;
}

/**
 * Check if a given year is valid for Wrapped generation.
 * We only allow the previous year and a few years back (for historical wrapped).
 */
export function isValidWrappedYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  const minYear = 2020; // GitHub data availability
  const maxYear = currentYear - 1; // Can't wrap the current year (it's not over)

  return year >= minYear && year <= maxYear;
}
