const {getUploadURL, getPublicURL} = require('./aws_S3_file_Handling')


const generatePortfolioUploadURL = async (req, res) => {
  try {
     const files = req.files;   // array of uploaded files (multer)
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const uploadedUrls = [];
    for (const file of files) {
      const fileKey = `workPortfolios/${req.user.id}/${Date.now()}-${file.originalname}`;
      // upload file.buffer to S3 with file.mimetype ...
      const publicUrl = getPublicURL(fileKey);
      uploadedUrls.push(publicUrl);
    }
    console.log( uploadedUrls)
    res.status(200).json({ urls: uploadedUrls })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
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
