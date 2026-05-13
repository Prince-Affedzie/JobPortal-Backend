const { UserModel } = require("../Models/UserModel");
const TaskerProfile = require("../Models/TaskerModel");


const addRating = async (req, res) => {
  try {
    const { userId } = req.params; 
    const ratedBy = req.user.id;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (ratedBy === userId) {
      return res.status(400).json({ message: "You cannot rate yourself" });
    }

    const tasker = await TaskerProfile.findOne({ userId: userId });
    if (!tasker) return res.status(404).json({ message: "Tasker not found" });

    // Add the new rating to the array
    tasker.ratingsReceived.push({
      user: ratedBy,
      rating,
      feedback,
      createdAt: new Date(),
    });

    // Update total count
    tasker.numberOfRatings = tasker.ratingsReceived.length;

    // Recalculate average rating
    const total = tasker.ratingsReceived.reduce((sum, r) => sum + r.rating, 0);
    tasker.rating = total / tasker.numberOfRatings;

    await tasker.save();

    return res.status(201).json({
      message: "Rating added successfully",
      rating: tasker.rating,
      numberOfRatings: tasker.numberOfRatings,
    });
  } catch (error) {
    console.error("Error adding rating:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId)
      .select("rating numberOfRatings ratingsReceived")
      .populate("ratingsReceived.ratedBy", "name role profileImage");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      averageRating: user.rating,
      numberOfRatings: user.numberOfRatings,
      ratings: user.ratingsReceived,
    });
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const updateRating = async (req, res) => {
  try {
    const { userId, ratingId } = req.params;
    const { rating, feedback } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ratingEntry = user.ratingsReceived.id(ratingId);
    if (!ratingEntry) {
      return res.status(404).json({ message: "Rating not found" });
    }

    if (rating) ratingEntry.rating = rating;
    if (feedback !== undefined) ratingEntry.feedback = feedback;

    // Recalculate average
    user.numberOfRatings = user.ratingsReceived.length;
    user.rating =
      user.ratingsReceived.reduce((sum, r) => sum + r.rating, 0) /
      user.numberOfRatings;

    await user.save();

    res.json({
      message: "Rating updated successfully",
      rating: user.rating,
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  addRating,
  getUserRatings,
  updateRating,
};
