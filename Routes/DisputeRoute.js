
const express = require('express');
const disputeRouter = express.Router();
const  {createDispute,getAllDisputes,resolveDispute} = require('../Controllers/DisputeController');
const {verify_token} =require('../MiddleWare/VerifyToken')
const {verifyAdminRoute} = require('../MiddleWare/EligibilityVerification')


disputeRouter.post('/disputes',verify_token, createDispute);


disputeRouter.get('/admin/disputes', verifyAdminRoute, getAllDisputes);


disputeRouter.put('/admin/disputes/:disputeId/resolve',  verify_token, verifyAdminRoute, resolveDispute);

module.exports =  {disputeRouter};
