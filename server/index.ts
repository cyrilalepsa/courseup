import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createMongoCourseUpStore } from "./db/mongoCourseUpStore.js";
import { getCourseUpStore, setCourseUpStore } from "./db/courseUpStore.js";
import { n2IngressMiddleware } from "./n2/ingressMiddleware.js";
import { createN2ApiRouter } from "./routes/n2ApiRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const MONGODB_URI = process.env.MONGODB_URI;

async function bootstrapStore(): Promise<void> {
  if (MONGODB_URI) {
    const mongoStore = await createMongoCourseUpStore(MONGODB_URI);
    setCourseUpStore(mongoStore);
    console.info("[N2] MongoDB store active (tenant-scoped collections)");
    return;
  }
  console.info("[N2] Memory store active — set MONGODB_URI for persistence");
  getCourseUpStore();
}

async function main(): Promise<void> {
  await bootstrapStore();

  const app = express();
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, ingress: "n2", tenant: "courseup" });
  });

  app.use("/api", n2IngressMiddleware, createN2ApiRouter());

  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, () => {
    console.info(`[N2] CourseUp Single Ingress listening on :${PORT}`);
  });
}

void main();
