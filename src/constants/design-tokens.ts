/**
 * Ryvonx Design Tokens
 * Single source of truth for colors, typography, spacing, and motion.
 * Import from here — never hardcode design values in components.
 */

export const colors = {
  navy: {
    50: "#f0f4f8",
    100: "#d9e2ec",
    200: "#bcccdc",
    300: "#9fb3c8",
    400: "#829ab1",
    500: "#627d98",
    600: "#486581",
    700: "#334e68",
    800: "#243b53",
    900: "#102a43",
    950: "#0a1929",
  },
  royal: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
  },
  gold: {
    50: "#fffbeb",
    100: "#fef3c7",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "var(--font-inter)",
    display: "var(--font-inter)",
    mono: "var(--font-jetbrains-mono)",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
  },
} as const;

export const spacing = {
  page: {
    x: "1.5rem",
    y: "2rem",
    maxWidth: "80rem",
  },
  section: "4rem",
  card: "1.5rem",
  stack: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
} as const;

export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgb(16 42 67 / 0.05)",
  md: "0 4px 6px -1px rgb(16 42 67 / 0.07), 0 2px 4px -2px rgb(16 42 67 / 0.05)",
  lg: "0 10px 15px -3px rgb(16 42 67 / 0.08), 0 4px 6px -4px rgb(16 42 67 / 0.05)",
  xl: "0 20px 25px -5px rgb(16 42 67 / 0.1), 0 8px 10px -6px rgb(16 42 67 / 0.05)",
} as const;

export const motion = {
  ease: {
    premium: [0.22, 1, 0.36, 1] as const,
    smooth: [0.4, 0, 0.2, 1] as const,
  },
  duration: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
  },
  variants: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 12 },
    },
    stagger: {
      animate: {
        transition: {
          staggerChildren: 0.08,
        },
      },
    },
  },
} as const;

export const chartColors = {
  primary: colors.royal[600],
  secondary: colors.navy[700],
  success: colors.emerald[600],
  accent: colors.gold[500],
  muted: colors.navy[300],
  grid: colors.navy[100],
} as const;
