/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F8F5",
        surface: "#FFFFFF",
        border: {
          DEFAULT: "#E5E8E1",
          subtle: "#EFF1EC",
          strong: "#D2D7CC",
        },
        charcoal: {
          DEFAULT: "#29332E",
          muted: "#57635D",
          subtle: "#7E8C84",
          light: "#A4B0A9",
        },
        sage: {
          DEFAULT: "#647C70",
          hover: "#53685E",
          active: "#44554D",
          light: "#E3E9E5",
          subtle: "#EFF3F0",
          border: "#C2CEC7",
        },
        indigo: {
          DEFAULT: "#7774A8",
          hover: "#666396",
          active: "#555282",
          light: "#E3E2F2",
          subtle: "#F1F0FA",
          text: "#464373",
        },
        status: {
          verified: {
            bg: "#EAF3EB",
            text: "#22543D",
            border: "#C6E1CD",
            dot: "#38A169",
          },
          contradicted: {
            bg: "#F9EAEA",
            text: "#9B2C2C",
            border: "#F3C7C7",
            dot: "#E53E3E",
          },
          warning: {
            bg: "#FAF1E1",
            text: "#8C5E1A",
            border: "#F2DEC0",
            dot: "#C6974F",
          },
          info: {
            bg: "#F1F0FA",
            text: "#4B487A",
            border: "#D8D6EF",
            dot: "#7774A8",
          },
        },
      },
      borderRadius: {
        'lg': '10px',
        'xl': '12px',
        '2xl': '14px',
        '3xl': '16px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(41, 51, 46, 0.04)',
        'card': '0 1px 3px 0 rgba(41, 51, 46, 0.05), 0 1px 2px -1px rgba(41, 51, 46, 0.03)',
        'elevated': '0 4px 6px -1px rgba(41, 51, 46, 0.06), 0 2px 4px -2px rgba(41, 51, 46, 0.04)',
        'modal': '0 12px 28px -4px rgba(41, 51, 46, 0.12), 0 4px 8px -2px rgba(41, 51, 46, 0.04)',
      },
    },
  },
  plugins: [],
}
