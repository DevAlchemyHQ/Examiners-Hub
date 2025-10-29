/**
 * Browser ID Helper for Operation Queue System
 * 
 * Generates and persists a unique browser identifier for tracking operations.
 * This ID persists across page refreshes so we can identify which browser
 * created which operations during conflict resolution.
 * 
 * @see SYNC_ARCHITECTURE_PLAN.md
 */

const BROWSER_ID_KEY = 'operation-queue-browser-id';

/**
 * Get or create a unique browser ID
 * The ID persists in localStorage across sessions
 * 
 * @returns Unique browser identifier (e.g., "browser-1234567890-abc123")
 */
export function getBrowserId(): string {
  try {
    let browserId = localStorage.getItem(BROWSER_ID_KEY);
    
    if (!browserId) {
      // Generate new browser ID: browser-{timestamp}-{random}
      browserId = `browser-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(BROWSER_ID_KEY, browserId);
      console.log('🆔 Generated new browser ID:', browserId);
    }
    
    return browserId;
  } catch (error) {
    // Fallback if localStorage is unavailable
    console.warn('⚠️ Could not access localStorage for browser ID, using session ID');
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Clear browser ID (for testing/debugging)
 */
export function clearBrowserId(): void {
  localStorage.removeItem(BROWSER_ID_KEY);
}

