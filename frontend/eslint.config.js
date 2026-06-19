// ESLint 9 flat config for Next.js 15
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];
