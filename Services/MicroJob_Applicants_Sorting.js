const {UserModel} = require("../Models/UserModel")
const {MiniTask} =require("../Models/MiniTaskModel")



const matchApplicantsWithPipeline = async (microtaskId, sortBy = "totalScore", order = "desc") => {
  const microtask = await MiniTask.findById(microtaskId).lean();
  if (!microtask) throw new Error("Microtask not found");

  return UserModel.aggregate([
    {
      $match: {
        role: "job_seeker",
        appliedMiniTasks: microtask._id
      }
    },
    {
      $addFields: {
        matchedSkills: { $setIntersection: ["$skills", { $literal: microtask.skillsRequired }] },
        totalRequiredSkills: { $size: { $literal: microtask.skillsRequired } }
      }
    },
    {
      $addFields: {
        skillsScore: {
          $cond: [
            { $eq: ["$totalRequiredSkills", 0] },
            0,
            {
              $min: [
                { $multiply: [{ $divide: [{ $size: "$matchedSkills" }, "$totalRequiredSkills"] }, 25] },
                25
              ]
            }
          ]
        }
      }
    },
    {
      $addFields: {
        verificationScore: {
          $switch: {
            branches: [
              { case: { $eq: ["$vettingStatus", "approved"] }, then: 25 },
              { case: { $eq: ["$isVerified", true] }, then: 15 }
            ],
            default: 0
          }
        }
      }
    },
    {
      $addFields: {
        educationScore: {
          $cond: [
            {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$education",
                      as: "ed",
                      cond: { $regexMatch: { input: "$$ed.certification", regex: microtask.category, options: "i" } }
                    }
                  }
                },
                0
              ]
            },
            20,
            0
          ]
        }
      }
    },
    {
      $addFields: {
        expScore: {
          $cond: [
            {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$workExperience",
                      as: "exp",
                      cond: {
                        $or: [
                          { $regexMatch: { input: "$$exp.jobTitle", regex: microtask.title, options: "i" } },
                          { $regexMatch: { input: "$$exp.description", regex: microtask.category, options: "i" } }
                        ]
                      }
                    }
                  }
                },
                0
              ]
            },
            20,
            0
          ]
        }
      }
    },
    {
      $addFields: {
        totalScore: {
          $add: ["$skillsScore", "$verificationScore", "$educationScore", "$expScore"]
        }
      }
    },
    // 🔑 Dynamic Sort
    {
      $sort: { [sortBy]: order === "asc" ? 1 : -1 }
    },
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        skills: 1,
        createdAt:1,
        education: 1,
        workExperience: 1,
        workPortfolio: 1,
        profileImage: 1,
        Bio: 1,
        location: 1,
        isVerified: 1,
        vettingStatus: 1,
        rating: 1,
        numberOfRatings: 1,
        ratingsReceived: 1,
        expScore: 1,
        skillsScore: 1,
        verificationScore: 1,
        educationScore: 1,
        totalScore: 1
      }
    }
  ]);
};


module.exports = {matchApplicantsWithPipeline}

