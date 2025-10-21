// Servicio para almacenamiento local e IndexedDB
import { openDB } from "idb";

const DB_NAME = "precios-ar-db";
const STORE = "productos";

export async function saveProducto(producto: any) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id_producto" });
      }
    },
  });
  await db.put(STORE, producto);
}

export async function getProducto(id: string) {
  const db = await openDB(DB_NAME, 1);
  return db.get(STORE, id);
}
