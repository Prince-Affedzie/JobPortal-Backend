const { JobModel } = require('../Models/JobsModel');
const { ApplicationModel } = require("../Models/ApplicationModel");
const { MiniTask } = require("../Models/MiniTaskModel");
const {Payment} = require('../Models/PaymentModel')
const { UserModel } = require('../Models/UserModel');
const ConversationRoom = require('../Models/ConversationRoom');
const { getUploadURL, getPublicURL } = require('../Services/aws_S3_file_Handling');
const { matchApplicantsWithPipeline } = require('../Services/MicroJob_Applicants_Sorting');

const applyToJob = async (req, res) => {
    const { id } = req.user;
    const { Id } = req.params;
    const { coverLetter } = req.body;
    const resume = req.file ? req.file.filename : '';

    try {
        const job = await JobModel.findById(Id);
        const notificationService = req.app.get('notificationService');

        if (!job || job.status === "Closed") {
            return res.status(400).json({ message: "Application Closed For this Job" });
        }

        const hasAlreadyApplied = job.applicantsId.some(applicantId => {
            return applicantId.equals(id);
        });

        if (hasAlreadyApplied) {
            return res.status(400).json({ message: "You have already Applied to this job" });
        }

        const application = new ApplicationModel({
            user: id,
            job: Id,
            coverLetter: coverLetter,
            reviewer: job.employerId
        });

        let uploadUrl;
        if (req.file) {
            const filename = req.file.originalname;
            const contentType = req.file.mimetype;
            const fileKey = `resumes/${id}/${Date.now()}-${filename}`;
            uploadUrl = await getUploadURL(fileKey, contentType);
            const publicUrl = getPublicURL(fileKey);
            application.resume = publicUrl;
        }

        await UserModel.findOneAndUpdate(
            { '_id': id },
            { $push: { appliedJobs: Id } },
            { new: true }
        );

        job.noOfApplicants = job.noOfApplicants + 1;
        job.applicantsId.push(id);

        await notificationService.sendJobApplicationNotification({
            employerId: job.employerId,
            jobTitle: job.title
        });

        await application.save();
        await job.save();

        res.status(200).json({ uploadUrl: uploadUrl });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const viewAllApplications = async (req, res) => {
    try {
        const { id } = req.user;
        const jobsApplied = await ApplicationModel.find({ user: id }).populate('job').sort({ createdAt: -1 }).exec();
        res.status(200).json(jobsApplied);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const viewApplication = async (req, res) => {
    try {
        const { Id } = req.params;
        const application = await ApplicationModel.findById(Id);
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }
        res.status(200).json(application);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getNearbyTasks = async (req, res) => {
  try {
    const { id } = req.user; 
    const { maxDistance = 10 } = req.query; 

    const tasker = await UserModel.findById(id);
    if (!tasker || !tasker.location?.coordinates) {
      return res.status(400).json({ message: "Tasker location not found" });
    }

    const [longitude, latitude] = tasker.location.coordinates;

    const nearbyTasks = await MiniTask.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          spherical: true,
          maxDistance: parseFloat(maxDistance) * 1000, // Convert km to meters
          query: {
            status: { $in: ["Open"] },
            "address.coordinates": { $exists: true }
          }
        }
      },
      {
        $sort: { distance: 1 }
      },
      {
        $limit: 20 
      }
    ]);

   
    const tasksWithKm = nearbyTasks.map(task => ({
      ...task,
      distance: parseFloat((task.distance / 1000).toFixed(1)) 
    }));

    
    return res.status(200).json(tasksWithKm);
  } catch (error) {
    console.error("Error finding nearby tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const applyOrBidMiniTask = async (req, res) => {
    try {
        const { id } = req.user;
        const { Id } = req.params;
        const { amount, message, timeline } = req.body;
        const miniTask = await MiniTask.findById(Id).populate('employer',' _id name');
        const user = await UserModel.findById(id);

        if (!miniTask || !user) {
            return res.status(404).json({ message: "Task not found" });
        }
        if(!user.isVerified){
            return res.status(403).json(
              { message: "Sorry, you can't apply to tasks until you're verified. Verification typically takes 24 hours." });
        }



        if (user._id.toString() === miniTask.employer._id.toString()) {
            return res.status(400).json({ message: "You cannot apply/bid on your own task" });
        }

        if (miniTask.biddingType === "open-bid") {
            const existingBid = miniTask.bids.find((b) => b.bidder.toString() === id);
            if (existingBid) {
                return res.status(400).json({ message: "You have already placed a bid on this task" });
            }

            miniTask.bids.push({ bidder: id, amount, message, timeline });
            if (!miniTask.applicants.includes(id)) {
                miniTask.applicants.push(id);
                user.appliedMiniTasks.push(miniTask._id);
            }

            await miniTask.save();
            await user.save();

            const notificationService = req.app.get("notificationService");
            await notificationService.sendBidNotification({
                clientId: miniTask.employer._id,
                jobTitle: miniTask.title,
                bidderName:user.name,
                bidAmount:amount,
            });

            return res.status(200).json({ message: "Bid placed successfully" });
        }

        if (miniTask.biddingType === "fixed") {
            if (miniTask.applicants.includes(id)) {
                return res.status(400).json({ message: "You have already applied to this task" });
            }

            miniTask.applicants.push(id);
            user.appliedMiniTasks.push(miniTask._id);

            await miniTask.save();
            await user.save();

            const notificationService = req.app.get("notificationService");
            await notificationService.sendMicroJobApplicationNotification({
                clientId: miniTask.employer._id,
                jobTitle: miniTask.title,
                taskerName:user.name,
            });

            return res.status(200).json({ message: "Application submitted successfully" });
        }

        return res.status(400).json({ message: "Invalid task type" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const acceptMiniTaskAssignment = async (req, res) => {
    try {
        const { Id } = req.params;
        const { id } = req.user;
        const user = await UserModel.findById(id);
        const task = await MiniTask.findById(Id);
        const notificationService = req.app.get('notificationService');

        if (!task || !user) {
            return res.status(400).json({ message: "Task not Found." });
        }

        if (id !== task.assignedTo.toString()) {
            return res.status(400).json({ message: "Task Hasn't been assigned to you yet" });
        }

        task.assignmentAccepted = true;
        task.status = "In-progress";
        await task.save();

        let room = await ConversationRoom.findOne({
            participants: { $all: [id, task.employer], $size: 2 },
            job: task._id || null
        }).populate('participants');

        if (!room) {
            room = await ConversationRoom.create({
                participants: [id, task.employer],
                job: task._id || null,
            });
        }

        await notificationService.sendMicroJobAcceptanceNotification({
            username: user.name,
            clientId: task.employer._id,
            jobTitle: task.title
        });

        await room.save();
        res.status(200).json({ message: 'Task Accepted Successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const rejectMiniTaskAssignment = async (req, res) => {
    try {
        const { Id } = req.params;
        const { id } = req.user;
        const user = await UserModel.findById(id);
        const task = await MiniTask.findById(Id);
        const notificationService = req.app.get('notificationService');

        if (!task || !user) {
            return res.status(400).json({ message: "Task not Found." });
        }

        if (id !== task.assignedTo.toString()) {
            return res.status(400).json({ message: "Task Hasn't been assigned to you yet" });
        }

        task.assignedTo = null;
        task.status = "Open";
        task.finalAmount = null;
        await task.save();

        let room = await ConversationRoom.findOne({
            participants: { $all: [id, task.employer], $size: 2 },
            job: task._id || null
        }).populate('participants');

        await notificationService.sendMicroJobRejectionNotification({
            username: user.name,
            clientId: task.employer._id,
            jobTitle: task.title
        });

        if (room) {
            await room.deleteOne();
        }

        res.status(200).json({ message: 'Task Rejected Successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const getRecentJobApplications = async (req, res) => {
    try {
        const { id } = req.user;
        const applications = await ApplicationModel.find({ user: id })
            .populate('job', 'title company companyEmail status description')
            .populate({ path: 'reviewer', select: 'phone name email' })
            .sort({ createdAt: -1 });
        return res.status(200).json(applications);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const yourAppliedMiniTasks = async (req, res) => {
    try {
        const { id } = req.user;

        const user = await UserModel.findById(id).populate({
            path: 'appliedMiniTasks',
            populate: [
                {
                    path: 'employer',
                    select: 'name phone profileImage rating numberOfRatings'
                },
                {
                    path: 'bids.bidder',
                    select: 'name'
                }
            ]
        });

        const applications = [];
        const bids = [];

        user.appliedMiniTasks.forEach(task => {
            const isActiveTask = task.status === 'Open' ||
                (task.assignedTo && task.assignedTo.toString() === id.toString());

            if (!isActiveTask) return;

            const userBid = task.bids.find(bid => bid.bidder._id.toString() === id.toString());

            if (task.biddingType === "open-bid") {
                if (userBid) {
                    bids.push({
                        task: {
                            _id: task._id,
                            title: task.title,
                            description: task.description,
                            employer: task.employer,
                            biddingType: task.biddingType,
                            budget: task.budget,
                            deadline: task.deadline,
                            locationType: task.locationType,
                            category: task.category,
                            status: task.status,
                            assignedTo: task.assignedTo,
                            assignmentAccepted: task.assignmentAccepted,
                            createdAt: task.createdAt,
                            markDone: task.markedDoneByTasker
                        },
                        bid: {
                            amount: userBid.amount,
                            message: userBid.message,
                            timeline: userBid.timeline,
                            status: userBid.status,
                            createdAt: userBid.createdAt
                        }
                    });
                }
            } else if (task.biddingType === "fixed") {
                applications.push({
                    _id: task._id,
                    title: task.title,
                    description: task.description,
                    employer: task.employer,
                    biddingType: task.biddingType,
                    budget: task.budget,
                    deadline: task.deadline,
                    locationType: task.locationType,
                    category: task.category,
                    status: task.status,
                    assignedTo: task.assignedTo,
                    assignmentAccepted: task.assignmentAccepted,
                    appliedAt: task.createdAt,
                    markDone: task.markedDoneByTasker
                });
            }
        });

        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        bids.sort((a, b) => new Date(b.bid.createdAt) - new Date(a.bid.createdAt));

        res.status(200).json({
            applications,
            bids
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const removeAppliedMiniTasksFromDashboard = async (req, res) => {
    try {
        const { Ids } = req.body;
        const { id } = req.user;
        const user = await UserModel.findById(id);
        user.appliedMiniTasks = user.appliedMiniTasks.filter((taskId) => !Ids.includes(taskId.toString()));
        await user.save();
        res.status(200).json({ message: "Tasks Removed Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: " Internal Server Error" });
    }
};

const markTaskDoneByTasker = async (req, res) => {
  try {
    const { Id } = req.params;
    const { id } = req.user;
    const notificationService = req.app.get('notificationService');

    const task = await MiniTask.findById(Id).populate('assignedTo','_id name');
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure only assigned freelancer can mark this
    if (task.assignedTo?._id.toString() !== id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.markedDoneByTasker = true;
    task.taskerDoneAt = new Date();
    await notificationService.sendTaskerMarkedDoneNotification({
    clientId: task.employer,
    taskTitle: task.title,
    taskerName:task.assignedTo.name,
    });

    // Auto-complete if both marked
    if (task.markedDoneByEmployer) {
      task.status = "Completed";
      await notificationService.sendTaskCompletedNotification({
      clientId: task.employer,
      taskerId: task.assignedTo,
      taskTitle: task.title
    });
    }else{
        task.status = "Review"
    }

    await task.save();
    return res.status(200).json({ message: "Marked done by tasker", task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const unmarkTaskDoneByTasker = async (req, res) => {
  try {
    const { Id } = req.params;
    const { id } = req.user;

    const task = await MiniTask.findById(Id);
    if (!task) return res.status(404).json({ message: "Task not found" });



    // Ensure only freelancer can mark this
     if (task.assignedTo?.toString() !== id) {
      return res.status(403).json({ message: "Not authorized" });
    }


    if (task.status === "Completed") {
     return res.status(403).json({message: "Can't Perform This Action Since Task is Completed"})
    }

    task.markedDoneByTasker = false;
    task.taskerDoneAt = null;
    
    await task.save();
    return res.status(200).json({ message: "UnMarked done by Tasker", task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const viewEarnings = async(req,res)=>{
    try{
        const {id} = req.user
        const earnings = await Payment.find({
             beneficiary: id,
             
        })
        .populate('taskId')
        .populate('initiator', 'name profileImage')
        .sort({ createdAt: -1 })
        .exec();
       
        res.status(200).json(earnings)

    }catch(err){
        res.status(500).json({message:"Internal Server Error"})
    }
}



const  updateAvailability = async(req, res) =>{
  try {
    const { id } = req.user;
    const { status, nextAvailableAt } = req.body;

    const allowedStatuses = ["available", "busy", "away", "offline", "suspended"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      {
        "availability.status": status,
        "availability.nextAvailableAt": nextAvailableAt,
        "availability.lastActiveAt": new Date(),
      },
      { new: true }
    );

    res.status(200).json({message:"Availabiity Updated Successfully"});
  } catch (err) {
    res.status(500).json({ message: "Failed to update availability", error: err.message });
  }
}



const addPaymentMethod = async (req, res) => {
  try {
    const { id } = req.user;
    const {
      type,
      provider,
      accountName,
      accountNumber,
      countryCode,
      isDefault,
    } = req.body;

    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If new method is default, unset previous defaults
    if (isDefault) {
      user.paymentMethods.forEach((pm) => (pm.isDefault = false));
    }

    user.paymentMethods.push({
      type,
      provider,
      accountName,
      accountNumber,
      countryCode: countryCode || "GH",
      isDefault,
    });

    await user.save();
    res.status(200).json({ message: "Payment method added"});
  } catch (err) {
    console.error("Error adding payment method:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const modifyPaymentMethod = async (req, res) => {
  try {
    const { id } = req.user; 
    const { methodId } = req.params;
    const updates = req.body;
    
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find the specific payment method
    const methodIndex = user.paymentMethods.findIndex(
      (pm) => pm._id.toString() === methodId
    );

    if (methodIndex === -1)
      return res.status(404).json({ message: "Payment method not found" });

    // Handle "isDefault" switch logic
    if (updates.isDefault === true) {
      user.paymentMethods.forEach((pm, idx) => {
        pm.isDefault = idx === methodIndex;
      });
    }

    // Update allowed fields safely
    const allowedFields = [
      "provider",
      "accountName",
      "accountNumber",
      "countryCode",
      "isDefault",
      "verified",
    ];

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        user.paymentMethods[methodIndex][key] = updates[key];
      }
    }

    await user.save();
    return res.status(200).json({
      message: "Payment method updated successfully",
      paymentMethods: user.paymentMethods,
    });
  } catch (err) {
    console.error("Error modifying payment method:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const deletePaymentMethod = async (req, res) => {
  try {
    const {id} = req.user
    const {methodId } = req.params;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.paymentMethods = user.paymentMethods.filter(
      (pm) => pm._id.toString() !== methodId
    );

    await user.save();
    res.json({ message: "Payment method removed", user });
  } catch (err) {
    console.error("Error deleting payment method:", err);
    res.status(500).json({ message: "Server error" });
  }
};




module.exports = {
    applyToJob,
    viewAllApplications,
    viewApplication,
    applyOrBidMiniTask,
    acceptMiniTaskAssignment,
    rejectMiniTaskAssignment,
    getRecentJobApplications,
    yourAppliedMiniTasks,
    removeAppliedMiniTasksFromDashboard,
    markTaskDoneByTasker,
    unmarkTaskDoneByTasker,
    viewEarnings,
    updateAvailability ,
    addPaymentMethod,
    modifyPaymentMethod,
    deletePaymentMethod,
    getNearbyTasks,
};