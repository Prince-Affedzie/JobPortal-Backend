const {body,params,query,validationResult} = require ("express-validator")

const validateInput =[
    body("password")
       .isLength({min:6}).withMessage("Password must be at least Six Characters")
       .matches(/\d/).withMessage("Password must contain at least a number")
       .matches(/[A-Z]/).withMessage('Password must contain at least Uppercase letter')
       .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain a special character"),

       (req,res,next)=>{
               const errors = validationResult(req)
               if(!errors.isEmpty()){
                   return res.status(400).json({status: "error",
                       message: "Validation failed",
                       errors: errors.array().map(err => ({
                           field: err.param,
                           message: err.msg
                       }))})
               }
               next()
           }

    
]

module.exports = {validateInput}