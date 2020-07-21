module.exports = {
    env: {
        browser: true,
        es2020: true,
        node: true
    },
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module'
    },
    plugins: [
        '@typescript-eslint'
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 2,
        "@typescript-eslint/explicit-function-return-type": 2,
        "quotes": [
            "error",
            "single",
            {
                avoidEscape: true,
                allowTemplateLiterals: true
            }
            ],
        'semi': [
            'error',
            'always',
            {
                omitLastInOneLineBlock: true
            }
        ],
        'semi-spacing': [
            'error',
            {
                before: false,
                after: true
            }
        ],
        'sort-keys': 'off',
        'space-before-blocks': [
            'error',
            'always'
        ],
        'space-before-function-paren': [
            'error',
            {
                anonymous: 'ignore',
                named: 'never',
                asyncArrow: 'always'
            }
        ],
        'space-in-parens': [
            'error',
            'never'
        ],
        'space-infix-ops': 'error',
        'spaced-comment': [
            'error',
            'always',
            {
                block: {
                    exceptions: [
                        '*'
                    ],
                    balanced: true
                }
            }
        ],
        'switch-colon-spacing': [
            'error',
            {
                after: true,
                before: false
            }
        ],
        'arrow-spacing': [
            'error',
            {
                before: true,
                after: true
            }
        ],

        'block-spacing': [
            'error',
            'always'
        ],
        'object-curly-spacing': [
            'error',
            'always',
            {
                arraysInObjects: true,
                objectsInObjects: false
            }
        ],
        'no-constant-condition': 'off'
    }
};
