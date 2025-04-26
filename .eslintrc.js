const OFF = 0;

module.exports = {
    extends: '@yutengjing/eslint-config-react',
    rules: {
        'import/default': OFF,
        'unicorn/consistent-function-scoping': 1,
        'unicorn/no-empty-file': 1,
    },
};
