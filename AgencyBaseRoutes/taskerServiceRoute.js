const express =require('express');
const {
 getTaskerBookings,unlockBooking,confirmCompletion, getTaskerBookingById,
  requestCompletion,taskerDeclineBooking,acceptBooking
  //updateProgress,
} = require("../AgencyBaseControllers/taskerController.js");
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const taskerServiceRouter = express.Router();

taskerServiceRouter.get("/service/tasker/bookings", verify_token, getTaskerBookings);
taskerServiceRouter.get("/service/tasker/booking/:bookingId", verify_token, getTaskerBookingById);
taskerServiceRouter.patch("/service/tasker/booking/unlock/:bookingId", verify_token, unlockBooking);
taskerServiceRouter.patch("/service/tasker/booking/accept/:bookingId", verify_token, acceptBooking);

taskerServiceRouter.patch("/service/tasker/booking/:bookingId/reject",verify_token, taskerDeclineBooking);


// Mark job as completed
taskerServiceRouter.patch("/service/tasker/booking/confirm/:bookingId/complete", verify_token, confirmCompletion);


module.exports = {taskerServiceRouter}