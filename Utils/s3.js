// utils/s3.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
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
const getPreviewURL = async (key, allowDownload = false) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ResponseContentDisposition: allowDownload ? 'attachment' : 'inline',
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: allowDownload ? 86400 : 300 });
  return signedUrl;
};

module.exports = {
  getUploadURL,
  getPreviewURL,
};
