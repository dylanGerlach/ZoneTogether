import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./app/routes/auth.route.js";
const app = express();
app.use(cors());
dotenv.config();
const port = process.env.PORT || 3000;

app.use("/auth", authRoutes);

app.get("/", (req: any, res: any) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
