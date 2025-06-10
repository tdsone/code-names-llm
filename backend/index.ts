import "dotenv/config";
import express from "express";
import gameRoutes from "./routes/game";
import path from "path";

const app = express();
const port = 3000;

app.use(express.json());

const publicPath = path.join(__dirname, "..", "public");
app.use(express.static(publicPath));

app.use("/api/game", gameRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
