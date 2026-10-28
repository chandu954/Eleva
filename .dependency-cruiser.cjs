/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      from: { pathNot: '(^|/)node_modules/' },
      to: { circular: true },
    },
    {
      name: 'components-do-not-import-app-implementation',
      comment: 'Components use app only through the existing server-action interfaces; move other shared code down to lib or utils.',
      severity: 'error',
      from: { path: '^src/components/' },
      to: {
        path: '^src/app/',
        pathNot: '^src/app/(auth/login/actions|\\(dashboard\\)/(subscription/stripe-session|settings/actions)|eleva/api/tool/rewrite/rewrite-utils)\\.tsx?$',
      },
    },
    {
      name: 'lib-does-not-import-app-or-components',
      severity: 'error',
      from: { path: '^src/lib/' },
      to: { path: '^src/(app|components)/' },
    },
    {
      name: 'utils-does-not-import-upward',
      severity: 'error',
      from: { path: '^src/utils/' },
      to: { path: '^src/(app|components|lib)/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|\\.next|coverage|\\.turbo)/' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    },
  },
};
