import "dotenv/config";
import express from "express";
import gameRoutes from "./routes/game";
import path from "path";
import fs from "fs";

const app = express();
const port: number = Number(process.env.PORT) || 3000;

app.use(express.json());

const publicPath = process.env.PUBLIC_DIR
  ? path.resolve(__dirname, "..", process.env.PUBLIC_DIR)
  : path.resolve(__dirname, "../public")
console.log("Resolved publicPath:", publicPath);

app.use(express.static(publicPath));

app.use("/api/game", gameRoutes);

// Catch‑all handler for any request that didn’t match above routes
app.use((req, res) => {
  const indexFile = path.join(publicPath, "index.html");
  console.log("Catch‑all serving:", indexFile);

  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    console.error("index.html not found at:", indexFile);
    res.status(500).send("Frontend not built or index.html missing.");
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});