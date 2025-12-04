/**
 * Auto-save configuration and utilities
 */

export const AUTO_SAVE_CONFIG = {
  // Interval between auto-saves (ms)
  SAVE_INTERVAL: 3000, // 3 seconds

  // How long to keep drafts (ms)
  DRAFT_EXPIRY_TIME: 7 * 24 * 60 * 60 * 1000, // 7 days

  // How often to clean up expired drafts (ms)
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 1 day

  // Minimum meaningful content threshold
  MIN_CONTENT_LENGTH: 10,

  // Show draft recovery for content older than (ms)
  MIN_RECOVERY_TIME: 30 * 1000, // 30 seconds

  // Maximum number of drafts to keep per user
  MAX_DRAFTS_PER_USER: 5,

  // Fields that trigger auto-save
  WATCHED_FIELDS: [
    "name",
    "location",
    "description",
    "posterUrl",
    "bannerUrl",
  ] as const,
};
