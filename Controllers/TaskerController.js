const { JobModel } = require('../Models/JobsModel');
const { ApplicationModel } = require("../Models/ApplicationModel");
const { MiniTask } = require("../Models/MiniTaskModel");
const {Payment} = require('../Models/PaymentModel')
const TaskerProfile = require("../Models/TaskerModel");
const { UserModel } = require('../Models/UserModel');
const ConversationRoom = require('../Models/ConversationRoom');
const {geocodeAddress} = require('../Utils/geoService')
const { getUploadURL, getPublicURL,deleteFromS3,deleteMultipleFromS3, } = require('../Services/aws_S3_file_Handling');
const { matchApplicantsWithPipeline } = require('../Services/MicroJob_Applicants_Sorting');
const {ensureRecipientForBeneficiary} = require('../Controllers/PaymentController')



const getMiniTasks = async(req,res)=>{
    
    try{
        let query ={status:'Open'}
        
        const {search,category,subcategory,location, modeofDelivery} = req.query
        if(category && category !== "All Categories"){
            query.category = category
        }
        if(subcategory && subcategory !== "All Subcategories"){
            query.subcategory = subcategory
        }

        if(location && location !== "All Regions"){
            query['address.region'] = location
        }
        if( modeofDelivery && modeofDelivery !=="All Modes"){
            query.locationType =  modeofDelivery
        }
        
        if(search){

            query.$or =[
                {title:{$regex:search,$options:'i'}},
                {description:{$regex:search,$options:'i'}}
            ]

        }
        
        const miniTasks = await MiniTask.find(query).sort({createdAt:-1}).populate("employer","name phone isVerified")
        res.status(200).json(miniTasks)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})

    }
}


const Taskerboarding = async (req, res) => {
  try {
    const {
      phone,
      profileImage,
      providerType,
      businessName,
      tagline,
      servicesOffered,  
      bio,
      location,
    } = req.body;

    const { id } = req.user;
    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Account Doesn't Exist" });
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await UserModel.findOne({ phone });
      if (existingPhone) {
        return res.status(403).json({ message: "Phone Number Already Exists" });
      }
      user.phone = phone;
    } else if (phone) {
      user.phone = phone; 
    }
    if (profileImage) {
      user.profileImage = profileImage;
    }

    // --- 3. Find or create TaskerProfile ---
    let profile = await TaskerProfile.findOne({ userId: id });
    if (!profile) {
      profile = new TaskerProfile({ userId: id });
    }

    // --- 4. Branding ---
    if (providerType) profile.providerType = providerType;
    if (businessName !== undefined) profile.businessName = businessName;
    if (tagline !== undefined) profile.tagline = tagline;
    if (bio !== undefined) profile.bio = bio;
    if (servicesOffered) {
     let services = servicesOffered;
  // Parse if it came as a JSON string (FormData doesn't automatically parse)
   if (typeof servicesOffered === 'string') {
    try {
      services = JSON.parse(servicesOffered);
    } catch (err) {
      console.error('Failed to parse servicesOffered:', err);
      return res.status(400).json({ message: 'Invalid servicesOffered format' });
    }
  }
   // Optional: ensure each service has a name (required field)
   if (Array.isArray(services)) {
    profile.servicesOffered = services.filter(s => s.name && s.name.trim());
   } else {
    profile.servicesOffered = [];
   }
 }  

    // --- 5. Services offered ---
   { /*if (servicesOffered && Array.isArray(servicesOffered)) {
      const processedServices = [];

      for (const item of servicesOffered) {
        if (typeof item === 'string') {
        
          const service = await Service.findOne({ name: item });
          if (service) {
            processedServices.push({
              serviceId: service._id,
              name: service.name,
              description: '',
              priceType: 'negotiable',
              price: 0,
              currency: 'GHS',
            });
          }
        } else if (item.name) {
        
          let serviceId = item.serviceId;
          if (!serviceId && item.name) {
            const service = await Service.findOne({ name: item.name });
            serviceId = service?._id || null;
          }
          processedServices.push({
            serviceId: serviceId,
            name: item.name,
            description: item.description || '',
            priceType: item.priceType || 'negotiable',
            price: item.price || 0,
            currency: item.currency || 'GHS',
          });
        }
      }

      profile.servicesOffered = processedServices;
    }  */}
   
    if (location) {
      // Support both the structured {region, city, ...} and flat {suburb, town, ...}
      const loc = {
        region: location.region || location.state || '',
        city: location.city || location.town || '',

      };
      profile.location = loc;

      // Geocode if enough address info exists
      const addressString = [loc.city, loc.region].filter(Boolean).join(', ');
      if (addressString) {
        try {
          const geo = await geocodeAddress(addressString);
          if (geo) {
            profile.location.coordinates = [geo.longitude, geo.latitude];
          }
        } catch (geoErr) {
          console.error('Geocoding failed:', geoErr);
        }
      }
    }
    await profile.save();

    if (!user.taskerProfile || user.taskerProfile.toString() !== profile._id.toString()) {
      user.taskerProfile = profile._id;
    }

    await user.save();

    res.status(200).json({
      message: "Profile Updated Successfully",
      user: user,
      taskerProfile: profile,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const updateTaskerProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const updates = req.body;
   

    // Allowed fields list
    const allowedFields = [
      "providerType",
      "businessName",
      "brandBanner",
      "tagline",
      "servicesOffered",
      "bio",
      "workPortfolio",
      "businessRegistrationNo",
      "location",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // ----- PARSE JSON STRINGS (because multipart sends everything as strings) -----
    // Parse servicesOffered if it’s a JSON string
    if (updateData.servicesOffered && typeof updateData.servicesOffered === "string") {
      try {
        updateData.servicesOffered = JSON.parse(updateData.servicesOffered);
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON in servicesOffered" });
      }
    }
    // Parse workPortfolio if necessary
    if (updateData.workPortfolio && typeof updateData.workPortfolio === "string") {
      try {
        updateData.workPortfolio = JSON.parse(updateData.workPortfolio);
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON in workPortfolio" });
      }
    }
    // Parse location if it’s a JSON string (could happen if nested object stringified)
    if (updateData.location && typeof updateData.location === "string") {
      try {
        updateData.location = JSON.parse(updateData.location);
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON in location" });
      }
    }

    // Geocode location if coordinates are missing
    if (updateData.location) {
      const loc = updateData.location;
      if (
        !loc.coordinates ||
        !Array.isArray(loc.coordinates) ||
        loc.coordinates.length !== 2
      ) {
        const addressString = [loc.city, loc.region].filter(Boolean).join(", ");
        if (addressString) {
          try {
            const geo = await geocodeAddress(addressString);
            if (geo) {
              loc.coordinates = [geo.longitude, geo.latitude];
            }
          } catch (geoErr) {
            console.error("Geocoding failed:", geoErr);
          }
        }
      }
    }

    // Update the profile
    const updatedProfile = await TaskerProfile.findOneAndUpdate(
      { userId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Tasker profile not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      taskerProfile: updatedProfile,
    });
  } catch (err) {
    console.error("Update tasker profile error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getOwnTaskerProfile = async (req, res) => {
  try {
    const { id } = req.user; // logged‑in user ID

    // 1. Fetch user basics (name, email, phone, profileImage)
    const user = await UserModel.findById(id).select("name email phone profileImage");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Fetch the linked tasker profile
    const profile = await TaskerProfile.findOne({ userId: id });
    if (!profile) {
      return res.status(404).json({ message: "Tasker profile not found. Please complete onboarding first." });
    }

    // 3. Return a clean combined object
    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
      },
      taskerProfile: profile,
    });
  } catch (err) {
    console.error("Error fetching own tasker profile:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getNearbyTasks = async (req, res) => {
  try {
    const { id } = req.user; 
    const { maxDistance = 10 } = req.query; 

    console.log(id)
    const tasker = await TaskerProfile.findOne({userId:id});
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
        const tasker = await TaskerProfile.findOne({userId:id});
        const user = await UserModel.findById(id)

        if (!miniTask || !tasker) {
            return res.status(404).json({ message: "Task not found" });
        }
        if(!tasker.isVerified){
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

            miniTask.bids.push({ bidder: tasker._id, amount, message, timeline });
            if (!miniTask.applicants.includes(tasker._id)) {
                miniTask.applicants.push(tasker._id);
                tasker.appliedMiniTasks.push(miniTask._id);
            }

            await miniTask.save();
            await tasker.save();

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
            if (miniTask.applicants.includes(tasker._id)) {
                return res.status(400).json({ message: "You have already applied to this task" });
            }

            miniTask.applicants.push(tasker._id);
            tasker.appliedMiniTasks.push(miniTask._id);

            await miniTask.save();
            await tasker.save();

            const notificationService = req.app.get("notificationService");
            await notificationService.sendMicroJobApplicationNotification({
                clientId: miniTask.employer._id,
                jobTitle: miniTask.title,
                taskerName:user.name,
            });

            return res.status(200).json({ message: "Interest submitted successfully" });
        }

        return res.status(400).json({ message: "Invalid task type" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const negotiateOnMiniTask = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { Id } = req.params; 
    const { message, preferred,mid,lowest, } = req.body;
   const  negotiationPrices ={
       preferred,
       mid,
       lowest
     }


    const miniTask = await MiniTask.findById(Id).populate("employer", "_id name");
    const user = await UserModel.findById(userId);

    if (!miniTask || !user) {
      return res.status(404).json({ message: "Task or user not found." });
    }

    if (miniTask.biddingType !== "negotiation") {
      return res.status(400).json({ message: "This task does not support negotiation." });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message:
          "Sorry, you can't negotiate until your account is verified. Verification typically takes 24 hours.",
      });
    }

    if (user._id.toString() === miniTask.employer._id.toString()) {
      return res.status(400).json({ message: "You cannot negotiate on your own task." });
    }

    const alreadyNegotiated = miniTask.negotiations.some(
      (n) => n.tasker.toString() === userId
    );
    if (alreadyNegotiated) {
      return res.status(400).json({ message: "You have already submitted a negotiation for this task." });
    }

    const negotiationEntry = {
      tasker: userId,
      negotiationPrices,
      message,
      currentOfferedPrice: negotiationPrices?.preferred || 0,
      negotiationStage: 0,
      status: "pending",
    };

    miniTask.negotiations.push(negotiationEntry);

    if (!miniTask.applicants.includes(userId)) {
      miniTask.applicants.push(userId);
      user.appliedMiniTasks.push(miniTask._id);
    }

    await miniTask.save();
    await user.save();
     const notificationService = req.app.get("notificationService");
            await notificationService.sendMicroJobApplicationNotification({
                clientId: miniTask.employer._id,
                jobTitle: miniTask.title,
                taskerName:user.name,
            });

    res.status(200).json({
      message: "Negotiation submitted successfully.",
      negotiation: negotiationEntry,
    });
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
        const tasker = await TaskerProfile.findOne({userId:id})
        const task = await MiniTask.findById(Id);
        const notificationService = req.app.get('notificationService');

        if (!task || !user) {
            return res.status(400).json({ message: "Task not Found." });
        }

        if (tasker._id.toString() !== task.assignedTo.toString()) {
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
        const tasker = await TaskerProfile.findOne({userId:id})
        const notificationService = req.app.get('notificationService');

        if (!task || !user) {
            return res.status(400).json({ message: "Task not Found." });
        }

        if (tasker._id !== task.assignedTo.toString()) {
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
       

        const tasker = await TaskerProfile.findOne({userId:id}).populate({
            path: 'appliedMiniTasks',
            populate: [
                {
                    path: 'employer',
                    select: 'name phone profileImage'
                },
                {
                    path: 'bids.bidder',
                    select: 'name'
                }
            ]
        });


        const applications = [];
        const bids = [];

        tasker.appliedMiniTasks.forEach(task => {
            const isActiveTask = task.status === 'Open' ||
                (task.assignedTo && task.assignedTo.toString() === tasker._id.toString());
            
            if (!isActiveTask) return;

            const userBid = task.bids.find(bid => bid.bidder._id.toString() === tasker._id.toString());

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
                             _id: userBid._id,
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
        console.log(bids)

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
    const tasker = await TaskerProfile.findOne({userId:id})
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure only assigned freelancer can mark this
    if (task.assignedTo?._id.toString() !== tasker._id) {
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
    const tasker = await TaskerProfile.findOne({userId:id})
    if (!task) return res.status(404).json({ message: "Task not found" });



    // Ensure only freelancer can mark this
     if (task.assignedTo?.toString() !== tasker._id) {
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
       console.log(err)
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

    // Remove previous default if needed
    if (isDefault) {
      user.paymentMethods.forEach((pm) => (pm.isDefault = false));
    }

    user.paymentMethods.push({
      type: type || "mobile_money",
      provider,
      accountName,
      accountNumber,
      countryCode: countryCode || "GH",
      isDefault,
    });

    // Ensure Paystack recipient exists
    const recipientCode = await ensureRecipientForBeneficiary(user, {
      provider,
      accountName,
      accountNumber,
    });

    user.paystackRecipientCode = recipientCode;

    await user.save();

    res.status(200).json({ 
      message: "Payment method added successfully",
      recipientCode 
    });

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


const addWorkSamplesToProfile = async(req,res)=>{
  try{
    const {id} = req.user
    const user = await UserModel.findById(id)
    const tasker = await TaskerProfile.findOne({userId:id})
    if(!tasker){
      return res.status(500).json({message:"Tasker Account doesn't exist"})
    }
    
    tasker.workPortfolio.push(req.body)
    await tasker.save()
    res.status(200).json({message:"Work Samples Added Successfully"})


  }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}

const removeWorkSample = async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { id } = req.user;
    console.log(req.params)
    
    const user = await UserModel.findById(id);
    const tasker = await TaskerProfile.findOne({userId:id})
    if (!tasker) {
      return res.status(404).json({ message: "Tasker account doesn't exist" });
    }

    // Check if the work sample exists in user's portfolio
    console.log(tasker)
    const sampleExists = tasker.workPortfolio.some(sample => sample._id.toString() === sampleId);
    if (!sampleExists) {
      return res.status(404).json({ message: "Work sample not found" });
    }
    const portfolioToDelete = tasker.workPortfolio.find(sample => sample._id.toString() === sampleId)
    const fileurls = portfolioToDelete.files.map((i)=>i.publicUrl)
    deleteMultipleFromS3(fileurls).catch(console.error)

    // Filter out the sample and assign back to the array
    tasker.workPortfolio = tasker.workPortfolio.filter(sample => sample._id.toString() !== sampleId);
    
    await tasker.save();
    
    res.status(200).json({ 
      message: "Portfolio deleted successfully",
      remainingSamples: tasker.workPortfolio.length
    });

  } catch (err) {
    console.log("Error removing work sample:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const getBidById = async (req, res) => {
    try {
        const { bidId } = req.params;
        const userId = req.user.id;
        const tasker = await TaskerProfile.findOne({userId:userId})
        

        
    const task = await MiniTask.findOne({
            'bids._id': bidId
        }).populate('employer', 'name profileImage')
          .populate('bids.bidder', 'name profileImage');

        if (!task) {
            return res.status(404).json({ message: 'Bid not found' });
           
        }

        

        // Find the specific bid
        const bid = task.bids.id(bidId);
        
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check if the current user is the bidder
        if (bid.bidder._id.toString() !== tasker._id.toString()) {
          
            return res.status(403).json({ message: 'Unauthorized to view this bid' });
        }

        // Format the response
        const bidData = {
            _id: bid._id,
            amount: bid.amount,
            message: bid.message,
            timeline: bid.timeline,
            status: bid.status,
            createdAt: bid.createdAt,
            updatedAt: bid.updatedAt,
            task: {
                _id: task._id,
                title: task.title,
                description: task.description,
                budget: task.budget,
                deadline: task.deadline,
                locationType: task.locationType,
                category: task.category,
                status: task.status,
                employer: task.employer
            }
        };
       
        res.status(200).json(bidData);
    } catch (error) {
        console.error('Error fetching bid:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


const updateBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const userId = req.user.id;
        const tasker = await TaskerProfile.findOne({userId:userId})
        const { amount, message, timeline } = req.body;
        

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid amount is required' });
        }

        // Find the task containing the bid
        const task = await MiniTask.findOne({
            'bids._id': bidId,
            'bids.bidder': tasker._id,
            'bids.status': 'Pending'  // Only allow updates for pending bids
        });

        

        if (!task) {
            return res.status(404).json({ 
                message: 'Bid not found or cannot be updated' 
            });
        }

        // Check if task deadline hasn't passed
        if (new Date(task.deadline) < new Date()) {
            return res.status(400).json({ 
                message: 'Cannot update bid after task deadline' 
            });
        }

        // Find and update the bid
        const bid = task.bids.id(bidId);
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Update bid fields
        bid.amount = amount;
        bid.message = message || bid.message;
        bid.timeline = timeline || bid.timeline;
        bid.updatedAt = new Date();

        await task.save();

        res.status(200).json({
            message: 'Bid updated successfully',
            bid: {
                _id: bid._id,
                amount: bid.amount,
                message: bid.message,
                timeline: bid.timeline,
                status: bid.status,
                updatedAt: bid.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating bid:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



const withdrawBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const userId = req.user.id;
        const tasker = await TaskerProfile.findOne({userId:userId})
  

        // Find the task containing the bid
        const task = await MiniTask.findOne({
            'bids._id': bidId,
            'bids.bidder': tasker._id,
            'bids.status': 'Pending'  // Only allow withdrawal of pending bids
        });

        if (!task) {
            return res.status(404).json({ 
                message: 'Bid not found or cannot be withdrawn' 
            });
        }

        // Update bid status to withdrawn
        const bid = task.bids.id(bidId);
        bid.status = 'Withdrawn';
        bid.updatedAt = new Date();

        // Remove bidder from applicants list
        task.applicants = task.applicants.filter(
            applicantId => applicantId.toString() !== tasker._id
        );

        await task.save();

        res.status(200).json({ 
            message: 'Bid withdrawn successfully',
            bidId: bidId
        });
    } catch (error) {
        console.error('Error withdrawing bid:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
  getMiniTasks,
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
    negotiateOnMiniTask,
    addWorkSamplesToProfile,
    removeWorkSample,
    getBidById,
    updateBid ,
    withdrawBid,
    updateTaskerProfile,
    Taskerboarding,
    getOwnTaskerProfile,
    
};