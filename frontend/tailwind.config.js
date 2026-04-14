/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Flat values — required so text-primary, bg-primary/20, etc. resolve correctly.
        // Previously defined as {light, dark} objects with no DEFAULT key, breaking all utility classes.
        primary:   '#3b82f6',
        secondary: '#6366f1',
        accent:    '#22d3ee',
        success:   '#10b981',
        warning:   '#f59e0b',
        danger:    '#ef4444',
      },
      fontFamily: { sans: ['Inter', 'system-ui'] },
    },
  },
  plugins: [],
};
