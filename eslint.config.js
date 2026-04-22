import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    plugins: {
      'firebase-rules': firebaseRulesPlugin,
    },
    files: ['**/*.rules'],
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules,
    },
  },
];
