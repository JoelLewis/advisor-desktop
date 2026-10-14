/**
 * Represents a monetary value in the base currency (USD).
 * Stored as a number; consumers should apply formatting/rounding at the display layer.
 */
type Currency = number;

/**
 * Represents a percentage value as a decimal (e.g., 0.05 = 5%).
 * Functions expecting display-ready percentages should document that separately.
 */
type Percentage = number;

type ApiError = {
  code: string;
  message: string;
};

export type {
  Currency,
  Percentage,
  ApiError,
};
