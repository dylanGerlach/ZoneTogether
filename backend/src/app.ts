import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const app = express();
app.use(cors());
dotenv.config();
const port = process.env.PORT || 3000;

app.get("/", (req: any, res: any) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
