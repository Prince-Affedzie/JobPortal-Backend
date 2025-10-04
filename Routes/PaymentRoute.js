const express = require('express')

const paymentRouter = express.Router()
const {initializePayment,verifyPayment} = require('../Controllers/PaymentController')
const {verify_token} =require('../MiddleWare/VerifyToken')

paymentRouter.post('/initialize_payment',verify_token,initializePayment)
paymentRouter.put('/verify_payment/:reference',verify_token,verifyPayment)

module.exports = {paymentRouter}