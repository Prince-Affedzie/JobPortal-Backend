const express =require('express');
const {
  createServiceRequest,
  getClientRequests,
  getSingleServiceRequest,
  cancelServiceRequest,
  //rateService,
} = require("../AgencyBaseControllers.js/clientController.js");
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const clientServiceRouter = express.Router();


clientServiceRouter.post("/service/client-request-service", verify_token, createServiceRequest);


clientServiceRouter.get("/service/client-get-my-requests", verify_token, getClientRequests);


clientServiceRouter.get("/service/client-service-info/:id", verify_token, getSingleServiceRequest);


clientServiceRouter.patch("/service/client-request/:id/cancel", verify_token, cancelServiceRequest);


//router.post("/:id/rate", verify_token, rateService);

//export default clientServiceRouter;
module.exports = {clientServiceRouter}
