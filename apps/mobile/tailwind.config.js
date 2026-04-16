/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          primary: '#3dd6a5',
          secondary: '#7bd3ff',
        },
        // Background colors
        bg: {
          primary: '#07111b',
          secondary: '#08111d',
          tertiary: '#111c2d',
          light: '#1a2e49',
        },
        // Text colors
        text: {
          primary: '#f4f7fb',
          secondary: '#b8c7da',
          tertiary: '#8b99b0',
        },
        // Status colors
        success: '#2fda88',
        warning: '#f5a623',
        error: '#f76b6b',
        info: '#7bd3ff',
        // Semantic colors
        positive: '#0d4a3d',
        negative: '#5c1c26',
        warningBg: '#4a3d1a',
        // Border colors
        border: {
          default: '#18283f',
          subtle: '#1a2e49',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '18px',
        '2xl': '20px',
        '3xl': '24px',
        full: '999px',
      },
      fontSize: {
        hero: ['26px', { lineHeight: '32px', fontWeight: '800' }],
        h1: ['22px', { lineHeight: '28px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '26px', fontWeight: '700' }],
        h3: ['18px', { lineHeight: '24px', fontWeight: '700' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '500' }],
        bodySemibold: ['14px', { lineHeight: '20px', fontWeight: '600' }],
        sm: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        smBold: ['13px', { lineHeight: '18px', fontWeight: '600' }],
        caption: ['11px', { lineHeight: '16px', fontWeight: '400', textTransform: 'uppercase', letterSpacing: '0.5px' }],
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
