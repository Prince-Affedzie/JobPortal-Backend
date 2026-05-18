const {getUploadURL, getPublicURL} = require('./aws_S3_file_Handling')


const generatePortfolioUploadURL = async (req, res) => {
  try {
    const files = req.files;   // multer array
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { v4: uuidv4 } = await import('uuid');
    const uploadUrls = [];
    const publicUrls = [];

    for (const file of files) {
      // Unique key per file (use UUID for safety)
      const UID = uuidv4();
      const uniqueId = UID.substring(0, 8);
      const fileKey = `workPortfolios/${req.user.id}/${uniqueId}-${file.originalname}`;

      const uploadUrl = await getUploadURL(fileKey, file.mimetype);
      const publicUrl = getPublicURL(fileKey);

      uploadUrls.push(uploadUrl);
      publicUrls.push(publicUrl);
    }

    res.status(200).json({
      uploadUrls,   // note capital "U"
      publicUrls,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate upload URLs', details: err.message });
  }
};


const generateProfileImageUploadURL = async (req, res) => {
  try {
    const {filename, contentType } = req.body;
    console.log(req.body)
    const {id} = req.user
    const fileKey = `profileImages/${id}/${Date.now()}-${filename}`;
    const fileUrl = await getUploadURL(fileKey,contentType)
    const publicUrl = getPublicURL(fileKey);
    res.status(200).json({fileUrl,fileKey, publicUrl})
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};

const generateIdCardUploadURL = async (req, res) => {
  try {
    const {filename, contentType } = req.body;
    console.log(req.body)
    const {id} = req.user
    const fileKey = `idCards/${Date.now()}-${filename}`;
    const fileUrl = await getUploadURL(fileKey,contentType)
    const publicUrl = getPublicURL(fileKey);
    res.status(200).json({fileUrl,fileKey, publicUrl})
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};


const generateTaskMediaUploadURL = async (req, res) => {
  try {
    const {filename, contentType,taskId } = req.body;
    console.log(req.body)
    const {id} = req.user
    const fileKey = `tasksMedia/${Date.now()}-${filename}`;
    const fileUrl = await getUploadURL(fileKey,contentType)
    const publicUrl = getPublicURL(fileKey);
    res.status(200).json({fileUrl,fileKey, publicUrl})
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};


module.exports = {generatePortfolioUploadURL,generateProfileImageUploadURL,generateIdCardUploadURL,generateTaskMediaUploadURL}
