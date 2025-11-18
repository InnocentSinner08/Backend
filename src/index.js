import connectDB from "./db/index.js";
import dotenv from "dotenv"
// require('dotenv').config({path: './env'})
dotenv.config({
    path: './env'
})
connectDB()
// Method 2
// const app= express()
// ( async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error", (error)=>{
//             console.log("ERROR: ", error);
//             throw error
//         })
//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.port}`);
//         })
//     } catch (error) {
//         console.error("ERROR: ", error)
//         throw err
//     }

// })()


// Method 1
// import mongoose from "mongoose";   

// function connnectDB(){

// }
// connectDB()