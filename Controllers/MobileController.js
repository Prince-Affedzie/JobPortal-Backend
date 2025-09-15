const { MiniTask } = require("../Models/MiniTaskModel");
const { UserModel } = require("../Models/UserModel");

const TaskerDashboard = async (req, res) => {
  try {
    const { id } = req.user;

    const user = await UserModel.findById(id).populate("appliedMiniTasks");
    if (!user) {
      return res.status(404).json({ message: "Account not Found" });
    }

    // -----------------------------
    // 1. Tasks
    // -----------------------------
    const completedTasks = user.appliedMiniTasks.filter(
      (task) => task.status === "Completed" && task.assignedTo?.toString() === id.toString()
    );
    const inProgressTasks = user.appliedMiniTasks.filter(
      (task) => task.status === "In Progress" && task.assignedTo?.toString() === id.toString()
    );
    const pendingTasks = user.appliedMiniTasks.filter(
      (task) => task.status === "Open" && !task.assignedTo
    );

    const totalTasks =
      completedTasks.length + inProgressTasks.length + pendingTasks.length;
    const successRate =
      totalTasks > 0
        ? `${Math.round((completedTasks.length / totalTasks) * 100)}%`
        : "0%";

    // -----------------------------
    // 2. Earnings (sum budgets of completed tasks)
    // -----------------------------
    const totalEarnings = completedTasks.reduce(
      (sum, task) => sum + (task.budget || 0),
      0
    );

    // -----------------------------
    // 3. Applications
    // -----------------------------
    const submittedApps = user.appliedMiniTasks;
    const acceptedApps = submittedApps.filter(
      (task) => task.assignedTo?.toString() === id.toString()
    );
    const pendingApps = submittedApps.filter(
      (task) => task.status === "Open" && !task.assignedTo
    );

    const acceptanceRate =
      submittedApps.length > 0
        ? `${Math.round((acceptedApps.length / submittedApps.length) * 100)}%`
        : "0%";

    // -----------------------------
    // 4. Ratings (from UserModel)
    // -----------------------------
    const avgRating = user.averageRating || 0;
    const totalRatings = user.totalRatings || 0;

    // -----------------------------
    // Final Response
    // -----------------------------
    const stats = {
      earnings: {
        total: totalEarnings,
      },
      tasks: {
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        pending: pendingTasks.length,
        successRate,
      },
      applications: {
        submitted: submittedApps.length,
        accepted: acceptedApps.length,
        pending: pendingApps.length,
        acceptanceRate,
      },
      ratings: {
        average: avgRating,
        total: totalRatings,
      },
    };

    res.status(200).json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { TaskerDashboard };
