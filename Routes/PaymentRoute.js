const express = require('express')

const paymentRouter = express.Router()
const {initializePayment,verifyPayment,releasePayment,
  refundPayment,initializeCreditPurchase,getUserCredits,
  verifyCreditPurchase,} = require('../Controllers/PaymentController')
const {verify_token} =require('../MiddleWare/VerifyToken')

paymentRouter.post('/initialize_payment',verify_token,initializePayment)
paymentRouter.put('/verify_payment/:reference',verify_token,verifyPayment)
paymentRouter.put('/release_payment/:reference',verify_token,releasePayment)
paymentRouter.put('/refund_payment/:reference',verify_token,refundPayment)
paymentRouter.post('/initialize/credit_purchase',verify_token,initializeCreditPurchase)
paymentRouter.put('/verify/credit_purchase/:reference',verify_token,verifyCreditPurchase)
paymentRouter.get('/user_credits',verify_token,getUserCredits)

module.exports = {paymentRouter}