const { body, validationResult } = require("express-validator");

const validateInput = [
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least six characters.")
    .matches(/\d/).withMessage("Password must contain at least one number.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[!@#$%^&*(),.?\":{}|<>]/).withMessage("Password must contain at least one special character."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        const combinedMessage = [
        ...errors.array().map(err => err.msg)
      ].join(" ");
      
      return res.status(400).json({
       status: "error",
        message: combinedMessage,
        errors: [] 
      });
    }
    next();
  }
];

module.exports = { validateInput };
