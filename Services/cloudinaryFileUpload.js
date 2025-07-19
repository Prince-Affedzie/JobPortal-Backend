const streamifier = require('streamifier');
const  cloudinary =require('../Config/Cloudinary')
const { uploader } = cloudinary; 

class CloudinaryFileUploadService {
  /**
   * Uploads a file to Cloudinary
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {string} folder - The destination folder
   * @returns {Promise<{secure_url: string}>} The upload result
   */
  static async uploadFile(fileBuffer, folder) {
    return new Promise((resolve, reject) => {
      const stream = uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(stream);
    });
  }

  /**
   * Uploads a user profile image
   * @param {Buffer} fileBuffer 
   * @returns {Promise<string>} The secure URL of the uploaded image
   */
  static async uploadProfileImage(fileBuffer) {
    const result = await this.uploadFile(fileBuffer, 'user_profiles');
    return result.secure_url;
  }

  /**
   * Uploads an ID card image
   * @param {Buffer} fileBuffer 
   * @returns {Promise<string>} The secure URL of the uploaded image
   */
  static async uploadIDCard(fileBuffer) {
    const result = await this.uploadFile(fileBuffer, 'user_id_cards');
    return result.secure_url;
  }
}

module.exports = CloudinaryFileUploadService;