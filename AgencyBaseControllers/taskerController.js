const Booking = require("../Models/ServiceRequestModel");
const { UserModel } = require('../Models/UserModel');


 const getTaskerBookings = async (req, res) => {
  try {
    const tasker = req.user.id;

    const bookings = await Booking.find({ tasker })
      .select(
        "service description preferredDate preferredTime status disclosureLevel createdAt"
      )
      .populate("service")
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const unlockBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const taskerId = req.user.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.creditsDeducted) {
      return res.status(400).json({ message: "Booking already unlocked" });
    }

    // TODO: check tasker credit balance here
    const creditsRequired = 1;

    booking.creditsUsed = creditsRequired;
    booking.creditsDeducted = true;
    booking.disclosureLevel = 2;
    booking.unlockedAt = new Date();
    booking.status = "LOCKED";

    await booking.save();

    res.status(200).json({
      message: "Booking unlocked successfully",
      booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const acceptBooking = async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");
    const { bookingId } = req.params;
    const taskerId = req.user.id;
    const user = UserModel.finById(taskerId)

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    }).populate('client', 'name')
      .populate('tasker', 'name')
      .populate('service', 'name');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const creditsRequired = 3;

    booking.disclosureLevel = 3;
    booking.status = "ACCEPTED";
    user.credits = user.credits-creditsRequired
     
    await booking.save();
    await user.save();

    // 🔔 Notify client
    await notificationService.notifyClientBookingAccepted({
      clientId: booking.client._id,
      bookingTitle: booking.service?.name || 'Service booking',
      taskerName: booking.tasker?.name || 'Your tasker'
    });

    res.status(200).json({
      message: "Booking accepted successfully",
      booking,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const confirmCompletion = async (req, res) => {
  try {
    const notificationService = req.app.get("notificationService");
    const { bookingId } = req.params;
    const { pinCode } = req.body;
    const taskerId = req.user.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    })
      .populate('client', 'name')
      .populate('tasker', 'name')
      .populate('service', 'name');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.verification.pinCode !== pinCode) {
      return res.status(400).json({ message: "Invalid PIN" });
    }

    booking.verification.completionConfirmedAt = new Date();
    booking.status = "COMPLETED";

    await booking.save();

    const SCORE_POINTS = 5;

    await UserModel.findByIdAndUpdate(
      taskerId,
      { $inc: { score: SCORE_POINTS } }
    );

    
    await notificationService.notifyClientBookingCompleted({
      clientId: booking.client._id,
      serviceName: booking.service?.name || 'service',
      taskerName: booking.tasker?.name || 'Your tasker'
    });

    await notificationService.notifyTaskerBookingCompleted({
      taskerId: booking.tasker._id,
      serviceName: booking.service?.name || 'service'
    });

    res.status(200).json({ message: "Completion confirmed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const requestCompletion = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { price } = req.body;
    const taskerId = req.user.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.price = price;
    booking.verification.completionRequestedAt = new Date();
    booking.status = "COMPLETION_REQUESTED";

    await booking.save();

    res.status(200).json({ message: "Completion requested" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



const taskerDeclineBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const taskerId = req.user.id;
    const notificationService = req.app.get("notificationService");

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    })
      .populate('client', 'name')
      .populate('tasker', 'name')
      .populate('service', 'name');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (!["PENDING", "LOCKED"].includes(booking.status)) {
      return res.status(400).json({
        message: "Booking cannot be declined at this stage",
      });
    }

    booking.status = "DECLINED";
    await booking.save();

    // 🔔 Notify client
    await notificationService.notifyClientBookingDeclined({
      clientId: booking.client._id,
      serviceName: booking.service?.name || 'service',
      taskerName: booking.tasker?.name || 'The tasker'
    });

    res.status(200).json({ message: "Booking declined" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


 const getTaskerBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const taskerId = req.user.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      tasker: taskerId,
    })
      .populate("service")
      .populate("client", "name phone profileImage");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    let response = {
      _id: booking._id,
      service: booking.service,
      description: booking.description,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      status: booking.status,
      disclosureLevel: booking.disclosureLevel,
    };

    // Level 2: unlocked
    if (booking.disclosureLevel >= 2) {
      response.client = {
        name: booking.client.name,
        phoneNumber: booking.client.phoneNumber,
      };
      response.address = booking.address;
    }

    // Level 3: arrived
    if (booking.disclosureLevel >= 3) {
      response.verification = {
        qrCode: booking.verification.qrCode,
        pinCode: booking.verification.pinCode,
        arrivalConfirmedAt: booking.verification.arrivalConfirmedAt,
      };
    }

    res.status(200).json(booking);
  } catch (err) {
    console.error("Tasker get booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {getTaskerBookings,unlockBooking,confirmCompletion, getTaskerBookingById,
  requestCompletion,taskerDeclineBooking,acceptBooking}
