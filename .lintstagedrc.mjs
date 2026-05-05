// Run only on staged files for fast pre-commit feedback.
export default {
  '*.{ts,tsx,js,jsx}': ['prettier --write'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
