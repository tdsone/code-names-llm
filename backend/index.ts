import "dotenv/config";
import express from "express";
import gameRoutes from "./routes/game";

const app = express();
const port = 3000;

app.use(express.json());
app.use("/api/game", gameRoutes);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
