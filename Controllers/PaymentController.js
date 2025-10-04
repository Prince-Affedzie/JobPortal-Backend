const {Payment} = require('../Models/PaymentModel') 
const axios = require('axios')


const initializePayment = async(req,res)=>{
    const { v4: uuidv4 } = await import('uuid');
    try{
        const { id } = req.user;
        
         const transactionRef = uuidv4();
         const {taskId,beneficiary,amount} = req.body
         await Payment.create({
           taskId:taskId,
           initiator:id,
           beneficiary: beneficiary,
           amount: amount,
           transactionRef: transactionRef
         })
         res.status(200).json({reference:transactionRef })


    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}


const verifyPayment = async(req,res)=>{
    try{
        const {reference} = req.params
        const verifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
           headers: {
           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
         });

        const data = verifyRes.data.data;
        
        if (data.status === "success") {
         await Payment.findOneAndUpdate(
           {transactionRef: reference },
            { status: "in_escrow"},
            {paymentMethod : data.channel},
            {paymentChannel: data.authorization.bank},
            {mobileMoneyNumber: data.authorization.mobile_money_number,}
         );
        }
        res.status(200).json(data)
    }catch(err){
           console.log(err)
           res.status(500).json({messgae:"Internal Server Error"})
      
    }

}

module.exports = {initializePayment,verifyPayment}