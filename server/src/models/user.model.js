import mongoose from 'mongoose';

const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
  email:{
    type:String,
    match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required:true,
    unique:true,
  },
  passwordHash:{
    type:String,
    required:true,
    minlength:6,
    select:false,
  },
  role:{
    type:String,
    enum:['user','seller'],
    default:'user',
  },
})

const userModel = mongoose.model('User',userSchema);

export default userModel;   
