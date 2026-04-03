import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./app/routes/auth.route.js";
import organizationRoutes from "./app/routes/organization.route.js";
import messagingRoutes from "./app/routes/messaging.route.js";
import zonesRoutes from "./app/routes/zones.route.js";
import h3Routes from "./app/routes/h3.route.js";
export const app = express();
app.use(cors());
dotenv.config();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/organization", organizationRoutes);
app.use("/sessions", messagingRoutes);
app.use("/zones", zonesRoutes);
app.use("/h3", h3Routes);

app.get("/health", (req: any, res: any) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req: any, res: any) => {
  res.send("Hello World");
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });
}
