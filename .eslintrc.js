module.exports = {
    "env": {
        "browser": true,
        "es2020": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 11,
        "sourceType": "module",
        "project": "./tsconfig.lint.json"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "indent": [
            "error",
            2,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }
        ],
        "semi": [
            "error",
            "always"
        ],
        "comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
        }],
        "space-before-function-paren": ["error", {
            "anonymous": "always",
            "named": "never",
            "asyncArrow": "always",
        }],
        "max-len": ["warn", {
            "code": 120,
            "tabWidth": 2
        }],
        "object-curly-spacing": ["error", "always"],
        "@typescript-eslint/switch-exhaustiveness-check": ["error"],
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "prefer-spread": "off",

        // Make async code easier to maintain by highlighting common errors
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/promise-function-async": [
            "error",
            { "checkArrowFunctions": false }
        ],
        "no-return-await": "off",
        "@typescript-eslint/return-await": "error"
    }
};
