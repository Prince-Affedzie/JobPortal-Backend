const express =require('express');
const {
   createServiceRequest,
   getClientRequests,
   getSingleServiceRequest,
   acceptOffer,
   cancelServiceRequest,
   deleteServiceRequest,
   markServiceDone,
   updateServiceRequest,
  //rateService,
} = require("../AgencyBaseControllers/clientController.js")
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const clientServiceRouter = express.Router();


clientServiceRouter.post("/service/client-request-service", verify_token, createServiceRequest);


clientServiceRouter.get("/service/client-get-my-requests", verify_token, getClientRequests);


clientServiceRouter.get("/service/client-service-info/:requestId", verify_token, getSingleServiceRequest);


clientServiceRouter.patch("/service/client-request/:requestId/cancel", verify_token, cancelServiceRequest);

clientServiceRouter.patch("/service/accept-offer/:requestId/:offerId", verify_token, acceptOffer);

clientServiceRouter.delete("/service/delete/:requestId", verify_token, deleteServiceRequest);

clientServiceRouter.patch("/service/client-mark-service/:requestId/complete", verify_token, markServiceDone);

clientServiceRouter.put("/service/client_update_request/:requestId",verify_token,updateServiceRequest)




//router.post("/:id/rate", verify_token, rateService);

//export default clientServiceRouter;
module.exports = {clientServiceRouter}
