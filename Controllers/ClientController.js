const { JobModel } = require('../Models/JobsModel');
const { MiniTask } = require("../Models/MiniTaskModel");
const {ServiceCategory} = require('../Models/ServiceCategory')
const {searchRankedTaskers} = require('../Services/TaskerSearchService')
const { UserModel } = require('../Models/UserModel');
const ConversationRoom = require('../Models/ConversationRoom');
const {Payment} = require('../Models/PaymentModel')
const { processEvent } = require('../Services/adminEventService');
const { matchApplicantsWithPipeline } = require('../Services/MicroJob_Applicants_Sorting');
const {geocodeAddress} = require('../Utils/geoService')
const { getUploadURL, getPublicURL,deleteFromS3,deleteMultipleFromS3, } = require('../Services/aws_S3_file_Handling');


const postMiniTask = async (req, res) => {
    try {
      console.log('Processing')
        const { id } = req.user;
        const { title, description, budget, biddingType, deadline, locationType, address, category, subcategory, skillsRequired, requirements, media } = req.body;
        console.log(req.body)
        
        if (!title || !description || !deadline || !locationType) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        let geoData = {
            latitude: null,
            longitude: null,
            coordinates: [],
        };

        // Only attempt geocoding for on-site tasks with valid address
        if (locationType === 'on-site' && address && (address.city || address.region || address.suburb)) {
            try {
                const addressString = `${address.suburb || ""}, ${address.city || ""}, ${address.region || ""}`.trim();
                
                // Remove empty parts and clean up the address string
                const cleanAddress = addressString.replace(/,+/g, ',').replace(/^,|,$/g, '').trim();
                
                if (cleanAddress) {
                    const geo = await geocodeAddress(cleanAddress);
                    console.log("Geocoding result:", geo);

                    if (geo && geo.lat && geo.lon && !isNaN(parseFloat(geo.lat)) && !isNaN(parseFloat(geo.lon))) {
                        const lat = parseFloat(geo.lat);
                        const lon = parseFloat(geo.lon);
                        
                        geoData = {
                            latitude: lat,
                            longitude: lon,
                            coordinates: [lon, lat], // GeoJSON standard: [longitude, latitude]
                        };
                        console.log("Geocoding successful:", geoData);
                    } else {
                        console.log("Geocoding failed or returned invalid coordinates");
                        // Set default coordinates for Accra, Ghana if geocoding fails
                        geoData = {
                            latitude: 5.6037,
                            longitude: -0.1870,
                            coordinates: [-0.1870, 5.6037], // Default to Accra coordinates
                        };
                    }
                }
            } catch (geoError) {
                console.log("Geocoding error:", geoError);
                // Set default coordinates if geocoding fails
                geoData = {
                    latitude: 5.6037,
                    longitude: -0.1870,
                    coordinates: [-0.1870, 5.6037], // Default to Accra coordinates
                };
            }
        }

        // Build the task object
        const taskData = {
            title,
            description,
            employer: id,
            biddingType,
            budget: biddingType === 'negotiation' ? null : budget,
            deadline,
            media: media || [],
            locationType,
            category,
            subcategory,
            skillsRequired: skillsRequired || [],
            requirements: requirements || [],
        };

        // Only add address for on-site tasks
        if (locationType === 'on-site') {
            taskData.address = {
                region: address?.region || null,
                city: address?.city || null,
                suburb: address?.suburb || null,
                latitude: geoData.latitude,
                longitude: geoData.longitude,
                coordinates: geoData.coordinates.length > 0 ? geoData.coordinates : undefined,
            };
        }

        console.log("Final task data:", taskData);

        const newTask = new MiniTask(taskData);
        await newTask.save();
        
        processEvent("NEW_MICRO_JOB_POSTING", newTask);
         res.status(200).json({ message: "Task Created Successfully" });
    } catch (err) {
        console.log("Error in postMiniTask:", err);
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
    const { status, address } = body;

    const task = await MiniTask.findById(Id);
    if (!task) {
      return res.status(404).json({ message: "No Task Found" });
    }

    if (status && status !== task.status) {
      if (status === "Closed") {
        const canClose =
          task.status === "Completed" ||
          (task.status === "Open" && (!task.assignedTo || task.assignedTo === null));

        if (!canClose) {
          return res.status(400).json({
            message:
              "You can only close a task that is completed or open without any assigned freelancer.",
          });
        }
      } else if (status === "Open") {
        if (task.status !== "Closed") {
          return res.status(400).json({
            message: "You can only reopen a task that is currently closed.",
          });
        }
      } else {
        return res.status(400).json({ message: "Invalid status transition." });
      }
    }

    if (address) {
      const addressString = `${address.suburb || ""}, ${address.city || ""}, ${address.region || ""}`;
      const geo = await geocodeAddress(addressString);
      console.log(geo)

      
      if (geo && geo.lat && geo.lon && !isNaN(geo.lat) && !isNaN(geo.lon)) {
        body.address.latitude = geo.lat;
        body.address.longitude = geo.lon;
        body.address.coordinates = [geo.lon, geo.lat];
      } else {
        console.warn(" Invalid geocode result. Skipping coordinate update for:", addressString);
        delete body.address.coordinates;
      }
    }

    Object.assign(task, body);
    await task.save();

    return res.status(200).json({ message: "Mini Task Updated Successfully", task });
  } catch (err) {
    console.error("editMiniTask Error:", err);
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
        const fileUrls = task.media.map((i)=>i.url)
        deleteMultipleFromS3(fileUrls).catch(console.error())
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

const searchTaskers = async (req, res) => {
  try {
    const { address, searchQuery, maxDistance = 60 } = req.body;
    console.log(searchQuery)
    

    const addressString = `${address?.suburb || ""}, ${address?.town|| ""}, ${address?.city || ""}, ${address?.region || ""}`
      .replace(/,+/g, ",")
      .replace(/^,|,$/g, "")
      .trim();

     console.log(addressString) 
    let lat, lon;

    if (addressString) {
      const geo = await geocodeAddress(addressString);
      if (geo?.latitude && geo?.longitude) {
        lat = parseFloat(geo.latitude);
        lon = parseFloat(geo.longitude);
      }
    }
   
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Location could not be processed. Try providing a more specific place.",
      });
    }

    const baseMatch = {
      role: "job_seeker",
      isActive: true,
      isVerified: true,
      "availability.status": "available",
    };

   
    let taskers = await searchRankedTaskers(lon, lat, searchQuery, maxDistance);

   /*
    if (taskers.length < 10 && skills.length > 0) {
      const fallbackPipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] },
            distanceField: "distance",
            spherical: true,
            maxDistance: Number(maxDistance),
          },
        },
        { $match: baseMatch },
        {
          $project: {
            _id: 1,
            name: 1,
            rating: 1,
            skills: 1,
            profileImage: 1,
            distance: 1,
            "availability.status": 1,
            location: 1,
          },
        },
        { $sort: { distance: 1, rating: -1 } },
        { $limit: 50 },
      ];

      const fallback = await UserModel.aggregate(fallbackPipeline);
      taskers = [...taskers, ...fallback].filter(
        (v, i, a) => a.findIndex((t) => t._id.toString() === v._id.toString()) === i
      );
    }*/

    return res.status(200).json({ success: true, data: taskers });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

const getTaskers = async (req, res) => {
  try {
    const categories = await ServiceCategory.find({ isFeatured: true });

    const result = await Promise.all(
      categories.map(async (category) => {
        const subcategoryNames = category.subcategories.map(s => s.name); 
        // Example: ["Home Cleaning", "Office Cleaning"]

        const topTaskers = await UserModel.find({
          role: "job_seeker",
          isVerified: true,
          isActive: true,
          "serviceTags.subcategory": { $in: subcategoryNames }
        })
          .sort({ rating: -1, numberOfRatings: -1 })
          .limit(5);

        return { 
          category: category.name, 
          subcategories: category.subcategories,
          taskers: topTaskers 
        };
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};



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
    searchTaskers,
    getTaskers,
};