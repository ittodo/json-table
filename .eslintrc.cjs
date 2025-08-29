module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    es2022: true,
    browser: true,
    node: true
  },
  ignorePatterns: ['dist', 'dist-demo', 'node_modules'],
  rules: {
    // Allow pragmatic typing in early iterations; tighten over time
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow empty catch blocks (we intentionally ignore JSON stringify errors in demo)
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Tweak unused vars to allow underscore prefix
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Use ESM imports instead of require; but codebase should not rely on require
    '@typescript-eslint/no-var-requires': 'error'
  }
}
