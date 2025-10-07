// eslint.config.js

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// --- Import all your plugins ---
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/'],
  },

  // Base configurations to apply everywhere
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Main Configuration for your React + TypeScript project ---
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      // Register all the plugins we will use
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'sonarjs': sonarjs,
    },
    
    // Language options for JSX, Globals, etc.
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
      },
      globals: {
        ...globals.browser,
      },
    },

    // Settings for plugins, e.g., to detect the React version
    settings: {
      react: {
        version: 'detect', // Automatically detects the React version
      },
    },

    // --- YOUR RULES ---
    rules: {
      // Rules from the recommended configs we want to use
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Rule for React Refresh (Vite)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      
      // --- RULES TO ENFORCE SMALLER FILES & COMPONENTS ---
      
      // 1. File and Function Size Rules
      // Set to "warn" so you can refactor incrementally without breaking your build.
      // You can change "warn" to "error" later.
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],

      // 2. Component Complexity Rules
      'react/jsx-max-depth': ['warn', { max: 5 }],
      'sonarjs/cognitive-complexity': ['warn', 15], // Measures how hard code is to understand

      // --- OPTIONAL BUT RECOMMENDED RULES FOR CLEANER COMPONENTS ---
      
      // Encourages splitting components by limiting props. High prop count can
      // indicate a component is doing too much.
      'react/prop-types': 'off', // Not needed in TypeScript
      'react/jsx-props-no-spreading': ['warn', {
        'custom': 'ignore', // Allows spreading on custom components, but warns on HTML elements
        'explicitSpread': 'ignore',
      }],
    },
  },
);