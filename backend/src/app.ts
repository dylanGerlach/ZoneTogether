import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./app/routes/auth.route.js";
import organizationRoutes from "./app/routes/organization.route.js";
const app = express();
app.use(cors());
dotenv.config();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/organization", organizationRoutes);

app.get("/", (req: any, res: any) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
