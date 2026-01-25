import globals from "globals";

export default [
    {
        rules: {
            "no-unused-vars": "warn",
            "no-console": "warn",
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            }
        }
    },
];
