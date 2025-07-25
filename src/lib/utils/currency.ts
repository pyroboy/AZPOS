/**
 * Formats a number as a USD currency string.
 * @param value The number to format.
 * @returns A string formatted as currency (e.g., $1,234.56).
 */
export function currency(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'PHP'
	}).format(value);
}
