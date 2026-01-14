import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in the .env file");
}

export default defineConfig({
    out: "./drizzle",
    schema: ["./database/schema.ts"], // barrel with only new tables for additive migrations
    dialect: "postgresql",
    schemaFilter: [
        "accounts",
        "auth",
        "business",
        "campaigns",
        "prospects",
        "public",
        "service_accounts",
        "threads",
        "qualifications",
    ],
    dbCredentials: {
        url: process.env.DATABASE_URL,
    }
});
