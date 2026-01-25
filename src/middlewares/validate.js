export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next(); // Validated
    } catch (error) {
        next(error); // Pass ZodError to global handler
    }
};
