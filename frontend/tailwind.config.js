/** @type {import('tailwindcss').Config}
 * Minimal Tailwind root for tooling / parity with SaaS dashboards.
 * Sidebar UI uses RN StyleSheet + design tokens — use these utilities when migrating screens to NativeWind `className`.
 */
module.exports = {
  content: ['./App.{tsx,ts}', './screens/**/*.{tsx,ts}', './pages/**/*.{tsx,ts}', './components/**/*.{tsx,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          500: '#6366F1',
          600: '#4F46E5',
        },
      },
    },
  },
  plugins: [],
};
