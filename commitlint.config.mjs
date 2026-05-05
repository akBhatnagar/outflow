// Conventional Commits enforced on every commit via Husky commit-msg hook.
// Examples:
//   feat(auth): add 2FA via TOTP
//   fix(parsers/netflix): handle annual receipts with VAT line
//   chore(deps): bump prisma to 5.22
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};
