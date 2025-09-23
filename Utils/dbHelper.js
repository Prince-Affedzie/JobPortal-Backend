// utils/dbHelper.js
class DBHelper {
  static async withTimeout(promise, timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  static async safeAggregate(model, pipeline, options = {}) {
    const defaultOptions = {
      maxTimeMS: 8000,
      allowDiskUse: false,
      ...options
    };

    try {
      return await this.withTimeout(
        model.aggregate(pipeline).option(defaultOptions),
        defaultOptions.maxTimeMS + 2000
      );
    } catch (error) {
      console.error('Aggregate query failed:', error);
      throw error;
    }
  }

  static async safeCount(model, query = {}, options = {}) {
    const defaultOptions = {
      maxTimeMS: 5000,
      ...options
    };

    try {
      return await this.withTimeout(
        model.countDocuments(query).maxTimeMS(defaultOptions.maxTimeMS),
        defaultOptions.maxTimeMS + 2000
      );
    } catch (error) {
      console.error('Count query failed:', error);
      throw error;
    }
  }
}

module.exports = DBHelper;