const mongoose =require("mongoose");
const User = require("./user");

const locationSchema=new mongoose.Schema({
    name:{
        type:String,
        default:User.name,
    },
    mobilenumber:{
        type:String,
        default:User.mobilenumber,
    },
    state:{
        type: String,
        required:true,
    },
    district:{
        type:String,
        required:true,
    },
    pincode:{
        type:String,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    landmark:{
        type: String,
    },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
});

const Location=mongoose.model("Location",locationSchema);
module.exports=Location;