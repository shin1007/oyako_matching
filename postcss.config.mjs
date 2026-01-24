
import theme from "postcss-theme";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-theme": theme(),
  },
};

export default config;
