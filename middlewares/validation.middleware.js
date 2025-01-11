const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      return res.status(400).json({
        status: 'error',
        message: errorMessage,
      });
    }

    next();
  };
}; 

module.exports = {
    validateSchema
};