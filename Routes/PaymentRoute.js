const express = require('express')

const paymentRouter = express.Router()
const {initializePayment,verifyPayment,releasePayment,
  refundPayment,} = require('../Controllers/PaymentController')
const {verify_token} =require('../MiddleWare/VerifyToken')

paymentRouter.post('/initialize_payment',verify_token,initializePayment)
paymentRouter.put('/verify_payment/:reference',verify_token,verifyPayment)
paymentRouter.put('/release_payment/:reference',verify_token,releasePayment)
paymentRouter.put('/refund_payment/:reference',verify_token,refundPayment)

module.exports = {paymentRouter}