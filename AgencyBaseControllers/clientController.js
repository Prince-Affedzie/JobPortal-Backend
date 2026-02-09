const Booking = require("../Models/ServiceRequestModel");

const generateSixDigitPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const createBooking = async (req, res) => {
  try {
    const clientId = req.user.id;
    const {
      tasker,
      service,
      description,
      address,
      preferredDate,
      preferredTime,
      media,
    } = req.body;
    console.log(req.body)

    const booking = new Booking({
      client: clientId,
      tasker,
      service,
      description,
      address,
      preferredDate,
      preferredTime,
      media: media || [],
      status: "PENDING",
    });

    await booking.save();

    // notify tasker
    const notificationService = req.app.get("notificationService");
    await notificationService.notifyTaskerNewBooking(tasker, booking._id);

    res.status(201).json({
      message: "Booking sent successfully",
      bookingId: booking._id,
    });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const getClientBookings = async (req, res) => {
  try {
    const client = req.user.id;

    const bookings = await Booking.find({ client })
      .populate("tasker", "name profileImage")
      .populate("service")
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const confirmCompletion = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const clientId = req.user.id;
    const notificationService = req.app.get("notificationService");

    const booking = await Booking.findOne({
      _id: bookingId,
      client: clientId,
    }).populate('service','name');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "ACCEPTED") {
      return res.status(400).json({
        message: "Booking not accepted yet",
      });
    }

    // 🔐 Generate 6-digit PIN
    const completionPin = generateSixDigitPin();

    booking.verification.pinCode = completionPin;
    //booking.verification.completionConfirmedAt = new Date();
    //booking.status = "COMPLETED";

    await booking.save();
    const bookingTitle = booking.service.name 

    await notificationService.notifyClientWithCompletionPin({
      clientId:clientId,
      pin:completionPin,
      bookingTitle:bookingTitle
    })

   await notificationService.notifyTaskerPinRequired({
      taskerId: booking.tasker,
      bookingTitle: bookingTitle,
    });

    res.status(200).json({
      message: "Service completed successfully",
      pin: completionPin, 
    });
  } catch (err) {
    console.error("Confirm completion error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getClientBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const clientId = req.user.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      client: clientId,
    })
      .populate("tasker")
      .populate("service");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (err) {
    console.error("Get client booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const clientId = req.user.id;
    const notificationService = req.app.get("notificationService");

    const booking = await Booking.findOne({
      _id: bookingId,
      client: clientId,
    }).populate('service','name');;

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      ["ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(booking.status)
    ) {
      return res.status(400).json({
        message: "Booking can no longer be cancelled at this stage",
      });
    }

    booking.status = "CANCELLED";
    await booking.save();
    const bookingTitle = booking.service.name

    // Notify tasker
    if (booking.tasker) {
      await notificationService.notifyTaskerBookingCancelled({
       taskerId: booking.tasker,
       bookingTitle:bookingTitle
    });
    }

    res.status(200).json({
      message: "Booking cancelled successfully",
    });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports = {createBooking,getClientBookings,confirmCompletion,getClientBookingById,cancelBooking,}