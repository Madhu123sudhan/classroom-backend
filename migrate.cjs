require("dotenv/config");

const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
    try {
        console.log("Running database migrations...");

        await migrate(db, {
            migrationsFolder: "./drizzle",
        });

        console.log("Database migrations completed successfully.");
    } catch (error) {
        console.error("Migration failed:");
        console.error(error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();