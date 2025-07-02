
const express = require('express');
const disputeRouter = express.Router();
const  {createDispute,getAllDisputes,resolveDispute,getDispute} = require('../Controllers/DisputeController');
const {verify_token} =require('../MiddleWare/VerifyToken')
const {verifyAdminRoute} = require('../MiddleWare/EligibilityVerification')


disputeRouter.post('/create_dispute',verify_token, createDispute);


disputeRouter.get('/admin/get_disputes',verify_token,verifyAdminRoute,getAllDisputes);

disputeRouter.get('/get_disputes/:Id', verify_token,verifyAdminRoute, getDispute);


disputeRouter.put('/admin/disputes/:disputeId/resolve',  verify_token, verifyAdminRoute, resolveDispute);

module.exports =  {disputeRouter};
