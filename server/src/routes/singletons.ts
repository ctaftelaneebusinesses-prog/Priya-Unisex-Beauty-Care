import { Router } from "express";
import { singletonStore } from "../collectionStore.js";
import { requireAuth } from "../auth.js";
import { canReadSingleton, canWriteSingleton } from "../permissions.js";

export const singletonsRouter = Router();

singletonsRouter.use(requireAuth);

singletonsRouter.get("/:name", (req, res) => {
  const { name } = req.params;
  if (!canReadSingleton(req.user!.role, name)) {
    res.status(403).json({ error: "Not authorized to read this setting" });
    return;
  }
  res.json(singletonStore.get(name, null));
});

singletonsRouter.put("/:name", (req, res) => {
  const { name } = req.params;
  if (!canWriteSingleton(req.user!.role, name)) {
    res.status(403).json({ error: "Not authorized to change this setting" });
    return;
  }
  res.json(singletonStore.set(name, req.body));
});
