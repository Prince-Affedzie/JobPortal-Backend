const express =require('express');
const {
   createBooking,getClientBookings,confirmCompletion,getClientBookingById,cancelBooking,
  //rateService,
} = require("../AgencyBaseControllers/clientController.js")
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const clientServiceRouter = express.Router();


clientServiceRouter.post("/service/book", verify_token, createBooking);


clientServiceRouter.get("/service/bookings", verify_token,getClientBookings);


clientServiceRouter.get("/service/bookings/:bookingId", verify_token,getClientBookingById);


clientServiceRouter.patch("/service/bookings/:bookingId/cancel", verify_token, cancelBooking);

//clientServiceRouter.patch("/service/accept-offer/:requestId/:offerId", verify_token, acceptOffer);

//clientServiceRouter.delete("/service/delete/:requestId", verify_token, deleteServiceRequest);

clientServiceRouter.patch("/service/confirm/:bookingId/complete", verify_token, confirmCompletion);

//clientServiceRouter.put("/service/client_update_request/:requestId",verify_token,updateServiceRequest)


module.exports = {clientServiceRouter}
