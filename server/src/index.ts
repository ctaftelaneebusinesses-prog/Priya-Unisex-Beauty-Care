import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { collectionsRouter } from "./routes/collections.js";
import { singletonsRouter } from "./routes/singletons.js";
import { isFirstRun } from "./db.js";
import { runSeed } from "./seed.js";

if (isFirstRun()) {
  console.log("First run detected — seeding demo data...");
  runSeed();
  console.log("Seed complete.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/singletons", singletonsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Priya Salon backend listening on http://localhost:${PORT}`);
});
