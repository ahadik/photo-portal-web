/**
 * Format capture date/time nicely for display.
 * @param capturedAt - ISO date string or null
 * @returns Formatted date string or 'Date unknown'
 */
export function formatCaptureDate(capturedAt: string | null): string {
  if (!capturedAt) return 'Date unknown'
  
  try {
    const date = new Date(capturedAt)
    // Format as: "Monday, January 1, 2024 at 3:45 PM"
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    return date.toLocaleString('en-US', options)
  } catch (err) {
    return 'Date unknown'
  }
}

