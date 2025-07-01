import { DatabaseManager } from '../lib/database.js'
import chalk from 'chalk'
import { readdir } from 'fs/promises'
import ora from 'ora'

export async function apply() {
   const spinner = ora('Applying migrations...').start()

   try {
      const db = new DatabaseManager()

      await db.setupMigrationTable()
      const appliedMigrations = await db.getAppliedMigrations()
      const newMigrationsApplied = await applyNewMigrations(db, appliedMigrations)

      if (newMigrationsApplied === 0) {
         spinner.succeed('Database up to date')
      } else {
         spinner.succeed(`Applied ${newMigrationsApplied} migrations`)
      }
   } catch (error) {
      spinner.fail('Apply failed')
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error))
      process.exit(1)
   }
}

async function applyNewMigrations(
   db: DatabaseManager,
   appliedMigrations: string[]
): Promise<number> {
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
   const newMigrations = migrationFiles.filter((file) => !appliedMigrations.includes(file))

   if (newMigrations.length === 0) return 0

   let appliedCount = 0
   for (const file of newMigrations) {
      await db.applySingleSqlFile(file, actualPath)
      await db.markMigrationApplied(file)
      appliedCount++
   }

   return appliedCount
}
