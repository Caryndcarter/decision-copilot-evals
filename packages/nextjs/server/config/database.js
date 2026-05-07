import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monorepo root first (so root .env with Atlas URI is used when running from repo root)
dotenv.config({ path: join(__dirname, "../../../../.env.local") });
dotenv.config({ path: join(__dirname, "../../../../.env") });
dotenv.config({ path: join(__dirname, "../../.env.local") });
dotenv.config({ path: join(__dirname, "../../.env") });
dotenv.config({ path: join(__dirname, "../.env.local") });
dotenv.config({ path: join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "decision-copilot";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
}

class Database {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.db) {
      return this.db;
    }

    try {
      this.client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(DB_NAME);

      console.log(`Connected to MongoDB: ${DB_NAME}`);
      return this.db;
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("Disconnected from MongoDB");
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  getCollection(collectionName) {
    return this.getDb().collection(collectionName);
  }
}

const database = new Database();

export default database;

// clientPromise — used by @auth/mongodb-adapter and NextAuth
// Returns a Promise<MongoClient> that resolves to a connected client
let _clientPromise;
if (!MONGODB_URI) {
  // Return a rejected promise if no URI configured (avoids crash at import time)
  _clientPromise = Promise.reject(new Error("MONGODB_URI is not set"));
} else if (process.env.NODE_ENV === "development") {
  // In development, cache on globalThis to survive HMR
  if (!global._mongoClientPromise) {
    const devClient = new MongoClient(MONGODB_URI, { maxPoolSize: 10 });
    global._mongoClientPromise = devClient.connect();
  }
  _clientPromise = global._mongoClientPromise;
} else {
  const prodClient = new MongoClient(MONGODB_URI, { maxPoolSize: 10 });
  _clientPromise = prodClient.connect();
}

export const clientPromise = _clientPromise;
