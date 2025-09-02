import express from "express"
import { userRouter } from "./routes/user.route"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import spaceRouter from "./routes/space.route"
import adminRouter from "./routes/admin.router"
import avatarRouter from "./routes/avatar.route"
import cors from "cors"

dotenv.config()

const app = express()

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use("/api/v1/users", userRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/space", spaceRouter)
app.use("/api/v1/avatar", avatarRouter)

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000")
})