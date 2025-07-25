const {getUploadURL, getPublicURL} = require('./aws_S3_file_Handling')


const generatePortfolioUploadURL = async (req, res) => {
  try {
    const {filename, contentType } = req.body;
    console.log(req.body)
    const {id} = req.user
    const fileKey = `workPortfolios/${id}/${Date.now()}-${filename}`;
    const fileUrl = await getUploadURL(fileKey,contentType)
    const publicUrl = getPublicURL(fileKey);
    console.log(fileUrl,publicUrl)  
    res.status(200).json({fileUrl,fileKey, publicUrl})
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};

module.exports = {generatePortfolioUploadURL}
