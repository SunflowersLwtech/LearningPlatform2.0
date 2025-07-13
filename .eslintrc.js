module.exports = {
  env: {
    node: true,
    es2021: true,
    browser: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'off', // Allow console statements for logging
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'no-undef': 'error',
    'prefer-const': 'warn',
    'no-var': 'error',
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-void': 'error',
    'radix': 'warn',
    'yoda': 'warn',
    'no-case-declarations': 'warn',
    'no-control-regex': 'warn',
    'no-useless-escape': 'warn'
  },
  globals: {
    io: 'readonly',
    $: 'readonly',
    $$: 'readonly',
    bootstrap: 'readonly',
    Chart: 'readonly'
  }
};