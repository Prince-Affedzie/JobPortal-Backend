const { JobModel } = require('../Models/JobsModel');
const { MiniTask } = require("../Models/MiniTaskModel");
const { UserModel } = require('../Models/UserModel');
const ConversationRoom = require('../Models/ConversationRoom');
const {Payment} = require('../Models/PaymentModel')
const { processEvent } = require('../Services/adminEventService');
const { matchApplicantsWithPipeline } = require('../Services/MicroJob_Applicants_Sorting');

const postMiniTask = async (req, res) => {
    try {
        console.log("Executing")
        const { id } = req.user;
        const { title, description, budget, biddingType, deadline, locationType, address, category, subcategory, skillsRequired } = req.body;
        console.log(req.body)
        if (!title || !description  || !deadline || !locationType) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        const newTask = new MiniTask({
            title,
            description,
            employer: id,
            biddingType,
            budget,
            deadline,
            address,
            locationType,
            category,
            subcategory,
            skillsRequired,
        });

        

        await newTask.save();
        processEvent("NEW_MICRO_JOB_POSTING", newTask);
        return res.status(200).json({ message: "Task Created Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server Error" });
    }
};

const getBids = async (req, res) => {
    const { Id } = req.params;

    try {
        const minitask = await MiniTask.findById(Id).populate("bids.bidder");

        if (!minitask) {
            return res.status(404).json({ message: "Task Not Found" });
        }

        const Bids = minitask.bids.map((bid) => ({
            _id: bid._id,
            amount: bid.amount,
            message: bid.message,
            timeline: bid.timeline,
            createdAt: bid.createdAt,
            bidder: {
                _id: bid.bidder?._id,
                name: bid.bidder?.name,
                phone: bid.bidder?.phone,
                profileImage: bid.bidder?.profileImage,
                skills: bid.bidder?.skills,
                education: bid.bidder?.education,
                workExperience: bid.bidder?.workExperience,
                workPortfolio: bid.bidder?.workPortfolio,
                Bio: bid.bidder?.Bio,
                location: bid.bidder?.location,
                isVerified: bid.bidder?.isVerified,
                vettingStatus: bid.bidder?.vettingStatus,
                rating: bid.bidder?.rating,
                numberOfRatings: bid.bidder?.numberOfRatings,
                ratingsReceived: bid.bidder?.ratingsReceived,
                createdAt:bid.bidder?.createdAt,
            },
        }));

        return res.status(200).json(Bids);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const acceptBid = async (req, res) => {
    try {
        const { taskId, bidId } = req.params;
        const { id } = req.user;

        const miniTask = await MiniTask.findById(taskId).populate('employer','_id name');
        if (!miniTask) return res.status(404).json({ message: "Task not found" });

        if (miniTask.status === "In-progress" || miniTask.status === "Completed") {
            return res.status(400).json({ message: "Can not re-assign Task." });
        }

      

        if (miniTask.employer._id.toString() !== id) {
            return res.status(403).json({ message: "Not authorized to accept bids on this task" });
        }

        const bid = miniTask.bids.id(bidId);
        const isAlreadyAssigned = miniTask.assignedTo !== null
        if (!bid) return res.status(404).json({ message: "Bid not found" });

        miniTask.assignedTo = bid.bidder;
        miniTask.status = "Assigned";
        bid.status = "Accepted";
        miniTask.finalAmount = bid.amount;
        miniTask.funded = true;

        miniTask.bids.forEach(b => {
            if (b._id.toString() !== bidId) b.status = "Rejected";
        });

         if(isAlreadyAssigned){
             await Payment.findOneAndUpdate(
                {taskId:taskId},
                {$set:{beneficiary : bid.bidder }}

            )
        }


        let room = await ConversationRoom.findOne({
            participants: { $all: [id, bid.bidder], $size: 2 },
            job: miniTask._id || null
        }).populate('participants');

        if (!room) {
            room = await ConversationRoom.create({
                participants: [id, bid.bidder],
                job: miniTask._id || null,
            });
        }

        await miniTask.save();
        await room.save();

        const notificationService = req.app.get("notificationService");
        await notificationService.sendBidAcceptedNotification({
            freelancerId: bid.bidder,
            jobTitle: miniTask.title,
            clientName: miniTask.employer.name,
        });

        res.status(200).json({ message: "Bid accepted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const assignMiniTask = async (req, res) => {
    try {
        const { id } = req.user;
        const { taskId, applicantId } = req.params;
        const miniTask = await MiniTask.findById(taskId).populate('employer','name');
        const isAlreadyAssigned = miniTask.assignedTo !== null
        const notificationService = req.app.get('notificationService');

        if (!miniTask || miniTask.status === "In-progress" || miniTask.status === "Completed") {
            return res.status(404).json({ message: "Can not assign Task." });
        }

        miniTask.assignedTo = applicantId;
        miniTask.status = "Assigned";
        miniTask.finalAmount = miniTask.budget;
        miniTask.funded = true;

        if(isAlreadyAssigned){
             await Payment.findOneAndUpdate(
                {taskId:taskId},
                {$set:{beneficiary :applicantId }}

            )
        }

        let room = await ConversationRoom.findOne({
            participants: { $all: [id, applicantId], $size: 2 },
            job: miniTask._id || null
        }).populate('participants');

        if (!room) {
            room = await ConversationRoom.create({
                participants: [id, applicantId],
                job: miniTask._id || null,
            });
        }

        await notificationService.sendMicroJobAssignmentNotification({
            freelancerId: applicantId,
            jobTitle: miniTask.title,
            clientName: miniTask.employer.name,
        });

        await miniTask.save();
        await room.save();
        res.status(200).json({ message: "Task Assigned Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getMyCreatedMiniTasks = async (req, res) => {
    try {
        const { id } = req.user;
        const minitasks = await MiniTask.find({ employer: id })
            .populate("applicants")
            .populate("assignedTo")
            .sort({ createdAt: -1 });
        res.status(200).json(minitasks);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const viewMiniTaskInfo = async(req,res)=>{
    try{
        const {Id} = req.params
        const task = await MiniTask.findById(Id).populate("applicants").populate("assignedTo")
        if(!task){
            return res.status(400).json({message: 'Task not Found'})
        }
        res.status(200).json(task)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getMicroTaskApplicants = async (req, res) => {
    try {
        const { Id } = req.params;
        const { sortBy = "totalScore", order = "desc" } = req.query;
        const applicants = await matchApplicantsWithPipeline(Id, sortBy, order);
        res.status(200).json(applicants);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const editMiniTask = async (req, res) => {
    try {
        const { Id } = req.params;
        const { body } = req.body;
        const { status } = body;
        const task = await MiniTask.findById(Id);

        if (!task) {
            return res.status(400).json({ message: "No Task Found" });
        }

        if (status && status !== task.status) {
            if (status === "Closed") {
                const canClose =
                    task.status === "Completed" ||
                    (task.status === "Open" && (!task.assignedTo || task.assignedTo === null));

                if (!canClose) {
                    return res.status(400).json({
                        message: "You can only close a task that is completed or open without any assigned freelancer.",
                    });
                }
            } else if (status === "Open") {
                if (task.status !== "Closed") {
                    return res.status(400).json({
                        message: "You can only reopen a task that is currently closed.",
                    });
                }
            } else {
                return res.status(400).json({
                    message: "Invalid status transition.",
                });
            }
        }

        Object.assign(task, body);
        await task.save();

        return res.status(200).json({ message: "Mini Task Updated Successfully", task });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const deleteMiniTask = async (req, res) => {
    try {
        const { Id } = req.params;
        const task = await MiniTask.findById(Id);
        if (!task || task.assignedTo !== null || task.status === "In-progress") {
            return res.status(400).json({ message: "This task is not allowed for deletion" });
        }
        await task.deleteOne();
        res.status(200).json({ message: "Task Deleted Successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const markTaskDoneByClient = async (req, res) => {
  try {
    const { Id } = req.params;
    const { id } = req.user;
     const notificationService = req.app.get('notificationService');

    const task = await MiniTask.findById(Id).populate('employer','_id name');
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure only employer can mark this
    if (task.employer._id.toString() !== id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.markedDoneByEmployer = true;
    task.employerDoneAt = new Date();
    await notificationService.sendClientMarkedDoneNotification({
    taskerId: task.assignedTo,
    taskTitle: task.title,
    clientName:task.employer.name,
    });

    // Auto-complete if both marked
    if (task.markedDoneByTasker) {
      task.status = "Completed";
      await notificationService.sendTaskCompletedNotification({
      clientId: task.employer._id,
      taskerId: task.assignedTo,
      taskTitle: task.title
    });
    }

    await task.save();
    return res.status(200).json({ message: "Marked done by employer", task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};



const unmarkTaskDoneByClient = async (req, res) => {
  try {
    const { Id } = req.params;
    const { id } = req.user;

    const task = await MiniTask.findById(Id);
    if (!task) return res.status(404).json({ message: "Task not found" });



    // Ensure only employer can mark this
    if (task.employer.toString() !== id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (task.status === "Completed") {
     return res.status(403).json({message: "Can't Perform This Action Since Task is Completed"})
    }

    task.markedDoneByEmployer = false;
    task.employerDoneAt = null;

    // Auto-complete if both marked

    await task.save();
    return res.status(200).json({ message: "UnMarked done by employer", task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const viewAllPayments = async(req,res)=>{
    try{
        const {id} = req.user
        const payments = await Payment.find({initiator:id}).populate('taskId').sort({createdAt:-1})
        res.status(200).json(payments)

    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}



module.exports = {
    postMiniTask,
    getBids,
    acceptBid,
    assignMiniTask,
    getMyCreatedMiniTasks,
    viewMiniTaskInfo,
    getMicroTaskApplicants,
    editMiniTask,
    deleteMiniTask,
    markTaskDoneByClient, 
    unmarkTaskDoneByClient,
    viewAllPayments,
};