import { db } from "./db.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

export const collectionStore = {
  getAll(collection: string): Doc[] {
    const rows = db
      .prepare("SELECT data FROM collections WHERE collection = ?")
      .all(collection) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data));
  },

  getById(collection: string, id: string): Doc | undefined {
    const row = db
      .prepare("SELECT data FROM collections WHERE collection = ? AND id = ?")
      .get(collection, id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  },

  create(collection: string, doc: Doc): Doc {
    if (!doc.id) throw new Error("Document must have an id");
    db.prepare("INSERT INTO collections (collection, id, data) VALUES (?, ?, ?)").run(
      collection,
      doc.id,
      JSON.stringify(doc)
    );
    return doc;
  },

  update(collection: string, id: string, patch: Doc): Doc {
    const existing = collectionStore.getById(collection, id);
    if (!existing) throw new Error(`${collection} record ${id} not found`);
    const merged = { ...existing, ...patch };
    db.prepare("UPDATE collections SET data = ? WHERE collection = ? AND id = ?").run(
      JSON.stringify(merged),
      collection,
      id
    );
    return merged;
  },

  remove(collection: string, id: string): void {
    db.prepare("DELETE FROM collections WHERE collection = ? AND id = ?").run(collection, id);
  },

  replaceAll(collection: string, docs: Doc[]): void {
    db.prepare("DELETE FROM collections WHERE collection = ?").run(collection);
    const insert = db.prepare("INSERT INTO collections (collection, id, data) VALUES (?, ?, ?)");
    for (const doc of docs) {
      insert.run(collection, doc.id, JSON.stringify(doc));
    }
  },
};

export const singletonStore = {
  get<T>(name: string, defaultValue: T): T {
    const row = db.prepare("SELECT data FROM singletons WHERE name = ?").get(name) as
      | { data: string }
      | undefined;
    return row ? JSON.parse(row.data) : defaultValue;
  },

  set<T>(name: string, value: T): T {
    db.prepare(
      "INSERT INTO singletons (name, data) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data"
    ).run(name, JSON.stringify(value));
    return value;
  },
};
