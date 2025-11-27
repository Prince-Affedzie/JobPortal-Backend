// utils/s3.js
const { S3Client, PutObjectCommand, GetObjectCommand,DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
   region: process.env.AWS_REGION,
   credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Generate signed upload URL
const getUploadURL = async (key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 mins
  return signedUrl;
};

// Generate signed preview/download URL
const getPreviewURL = async (key, allowDownload) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ResponseContentDisposition: allowDownload ? 'attachment' : 'inline',
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: allowDownload ? 86400 : 300 });
  return signedUrl;
};


const getPublicURL = (key) => {
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};


const deleteFromS3 = async (fileUrl) => {
  try {
    
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); 
    
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    });
    
    await s3Client.send(command);
    console.log(`Successfully deleted ${key} from S3`);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
};

// For deleting multiple files efficiently
const deleteMultipleFromS3 = async (fileUrls) => {
  try {
    // Extract keys from URLs
    const keys = fileUrls.map(url => {
      const urlObj = new URL(url);
      return { Key: urlObj.pathname.substring(1) };
    });

    // Use DeleteObjectsCommand for batch deletion (more efficient)
    if (keys.length > 0) {
      const command = new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Delete: {
          Objects: keys,
          Quiet: false // Set to true if you don't want detailed response
        }
      });
      
      await s3Client.send(command);
      console.log(`Successfully deleted ${keys.length} files from S3`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting multiple files from S3:', error);
    
    
    console.log('Attempting individual deletions...');
    const individualDeletions = fileUrls.map(url => deleteFromS3(url));
    await Promise.allSettled(individualDeletions);
    
    return true; 
  }
};


const deleteMultipleSubmissionFilesFromS3 = async (keys) => {
  try {
    // Validate input
    if (!Array.isArray(keys)) {
      console.error('Keys must be an array, received:', typeof keys);
      return false;
    }

    console.log('Raw keys received:', keys);
    const validKeys = keys
      .filter(key => {
        const isValid = key && typeof key === 'string' && key.trim().length > 0;
        if (!isValid) {
          console.log('Filtered out invalid key:', key);
        }
        return isValid;
      })
      .map(key => ({ Key: key.trim() }));

    console.log('Valid formatted keys:', validKeys);

    if (validKeys.length === 0) {
      console.log('No valid keys provided for deletion');
      return true;
    }

    // Use DeleteObjectsCommand for batch deletion
    const command = new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: validKeys,
        Quiet: false
      }
    });
    
    console.log('Sending delete command to S3...');
    const result = await s3Client.send(command);
    
    if (result.Errors && result.Errors.length > 0) {
      console.error('Errors deleting some files:', result.Errors);
    }
    
    if (result.Deleted && result.Deleted.length > 0) {
      console.log(`Successfully deleted ${result.Deleted.length} files from S3`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting multiple files from S3:', error);
    
    if (error.name === 'MalformedXML') {
      console.error('MalformedXML error - likely issue with keys format');
      console.error('Bucket:', process.env.AWS_S3_BUCKET);
    }
    
    return false;
  }
};
module.exports = {
  getUploadURL,
  getPreviewURL,
  getPublicURL,
  deleteFromS3,
  deleteMultipleFromS3,
  deleteMultipleSubmissionFilesFromS3,
};
