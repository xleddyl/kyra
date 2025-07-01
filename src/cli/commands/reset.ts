import { DatabaseManager } from '../lib/database.js'
import chalk from 'chalk'
import { readdir } from 'fs/promises'
import ora from 'ora'
import { createInterface } from 'readline'

interface ResetOptions {
   yes?: boolean
}

export async function reset(options: ResetOptions = {}) {
   try {
      const db = new DatabaseManager()

      if (!options.yes) {
         const confirmed = await askConfirmation(
            `Reset database: drop and recreate with all migrations and seeds?`
         )
         if (!confirmed) {
            console.log('Cancelled')
            return
         }
      }

      const spinner = ora('Resetting database...').start()

      try {
         spinner.text = 'Clearing database...'
         const client = await db.createClient()
         try {
            // Drop all user-created schemas (keep system schemas)
            await client.query(`
               DO $$ DECLARE
                   r RECORD;
               BEGIN
                   -- Drop all user schemas except information_schema, pg_catalog, pg_toast, public, and kyra
                   FOR r IN (
                       SELECT schema_name
                       FROM information_schema.schemata
                       WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'kyra')
                       AND schema_name NOT LIKE 'pg_temp_%'
                       AND schema_name NOT LIKE 'pg_toast_temp_%'
                   ) LOOP
                       EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
                   END LOOP;

                   -- Drop all objects in public schema
                   FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                       EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                   END LOOP;

                   FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
                       EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
                   END LOOP;

                   FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                       EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
                   END LOOP;

                   FOR r IN (SELECT proname FROM pg_proc INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid) WHERE ns.nspname = 'public') LOOP
                       EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
                   END LOOP;
               END $$;
            `)
         } finally {
            await client.end()
         }

         spinner.text = 'Setting up migration table...'
         await db.setupMigrationTable()

         spinner.text = 'Applying migrations...'
         const migrationsApplied = await applyMigrations(db)

         spinner.text = 'Applying seeds...'
         try {
            await db.applySqlFiles('/app/kyra/seeds')
         } catch {
            // Continue if seeds fail
         }

         spinner.succeed(`Reset complete (${migrationsApplied} migrations)`)
      } catch (error) {
         spinner.fail('Reset failed')
         throw error
      }
   } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error))
      process.exit(1)
   }
}

async function applyMigrations(db: DatabaseManager): Promise<number> {
   const possiblePaths = ['/app/kyra/migrations', './migrations', '../migrations']
   let actualPath = ''
   let files: string[] = []

   for (const path of possiblePaths) {
      try {
         files = await readdir(path)
         actualPath = path
         break
      } catch {
         continue
      }
   }

   if (!actualPath) return 0

   const migrationFiles = files.filter((file) => file.endsWith('.sql')).sort()
   if (migrationFiles.length === 0) return 0

   let appliedCount = 0
   for (const file of migrationFiles) {
      await db.applySingleSqlFile(file, actualPath)
      await db.markMigrationApplied(file)
      appliedCount++
   }

   return appliedCount
}

function askConfirmation(question: string): Promise<boolean> {
   return new Promise((resolve) => {
      const rl = createInterface({
         input: process.stdin,
         output: process.stdout,
      })

      rl.question(chalk.yellow(`⚠ ${question} (y/N) `), (answer) => {
         rl.close()
         resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes')
      })
   })
}
