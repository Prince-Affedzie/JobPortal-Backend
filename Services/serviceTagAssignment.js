const {ServiceCategory} = require('../Models/ServiceCategory')

async function getServiceTagFromSkill(skill) {
  // Load all service categories from DB once
  const categories = await ServiceCategory.find({});

  skill = skill.trim().toLowerCase();

  for (const category of categories) {
    for (const sub of category.subcategories) {
      // Check: exact match OR keyword match (more flexible)
      const match =
        sub.name.toLowerCase() === skill ||
        sub.keywords.some(k => k.toLowerCase() === skill);

      if (match) {
        return {
          category: category.name,
          subcategory: sub.name
        };
      }
    }
  }

  return null;
}

module.exports = { getServiceTagFromSkill };
