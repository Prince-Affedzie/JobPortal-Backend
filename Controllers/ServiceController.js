const {Service} = require('../Models/ServiceModel')

const getAllServices = async(req,res)=>{
try{
    const services = await Service.find()
    res.status(200).json(services)

}catch(err){
    console.log(err)
    res.status(500).json({message:"Internal Server Error"})
}
}

module.exports = {getAllServices}