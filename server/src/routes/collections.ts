import { Router } from "express";
import { collectionStore } from "../collectionStore.js";
import { requireAuth } from "../auth.js";
import { canReadCollection, canWriteCollection } from "../permissions.js";

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

collectionsRouter.get("/:collection", (req, res) => {
  const { collection } = req.params;
  if (!canReadCollection(req.user!.role, collection)) {
    res.status(403).json({ error: "Not authorized to read this collection" });
    return;
  }
  res.json(collectionStore.getAll(collection));
});

collectionsRouter.get("/:collection/:id", (req, res) => {
  const { collection, id } = req.params;
  if (!canReadCollection(req.user!.role, collection)) {
    res.status(403).json({ error: "Not authorized to read this collection" });
    return;
  }
  const doc = collectionStore.getById(collection, id);
  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(doc);
});

collectionsRouter.post("/:collection", (req, res) => {
  const { collection } = req.params;
  if (!canWriteCollection(req.user!.role, collection)) {
    res.status(403).json({ error: "Not authorized to write to this collection" });
    return;
  }
  try {
    const created = collectionStore.create(collection, req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Create failed" });
  }
});

collectionsRouter.patch("/:collection/:id", (req, res) => {
  const { collection, id } = req.params;
  if (!canWriteCollection(req.user!.role, collection)) {
    res.status(403).json({ error: "Not authorized to write to this collection" });
    return;
  }
  try {
    const updated = collectionStore.update(collection, id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : "Update failed" });
  }
});

collectionsRouter.delete("/:collection/:id", (req, res) => {
  const { collection, id } = req.params;
  if (!canWriteCollection(req.user!.role, collection)) {
    res.status(403).json({ error: "Not authorized to delete from this collection" });
    return;
  }
  collectionStore.remove(collection, id);
  res.status(204).end();
});

collectionsRouter.put("/:collection", (req, res) => {
  const { collection } = req.params;
  if (req.user!.role !== "OWNER") {
    res.status(403).json({ error: "Only the owner can bulk-replace a collection" });
    return;
  }
  if (!Array.isArray(req.body)) {
    res.status(400).json({ error: "Body must be an array of documents" });
    return;
  }
  collectionStore.replaceAll(collection, req.body);
  res.status(204).end();
});
