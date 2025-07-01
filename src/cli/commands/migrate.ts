import { DatabaseManager } from '../lib/database.js'
import { apply } from './apply.js'
import chalk from 'chalk'
import { exec } from 'child_process'
import { mkdir, writeFile } from 'fs/promises'
import ora from 'ora'
import { join } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface MigrateOptions {
   name?: string
   dryRun?: boolean
   schema?: boolean
}

export async function migrate(options: MigrateOptions = {}) {
   const spinner = ora('Generating migrations...').start()

   try {
      const db = new DatabaseManager()
      const shadowDbName = `shadow_${Date.now()}`

      // Ensure migrations directory exists
      spinner.text = 'Setting up migrations directory...'
      try {
         await mkdir('/app/kyra/migrations', { recursive: true })
      } catch {
         // Directory might already exist
      }

      spinner.text = 'Creating shadow database...'
      await db.createDatabase(shadowDbName)

      try {
         spinner.text = 'Applying schema to shadow database...'
         await db.applySqlFiles('/app/kyra/schema', shadowDbName)

         spinner.text = 'Generating diff with migra...'
         const currentDbUrl = process.env.DATABASE_URL
         const shadowDbUrl = `${process.env.DATABASE_URL?.split('/').slice(0, -1).join('/')}/${shadowDbName}`

         let migraDiff = ''
         let migraStderr = ''

         try {
            const result = await execAsync(
               `migra "${currentDbUrl}" "${shadowDbUrl}" --unsafe --schema ${options.schema || 'public'}`,
               { timeout: 30000 } // 30 second timeout
            )
            migraDiff = result.stdout
            migraStderr = result.stderr
         } catch (execError: any) {
            // Migra exits with code 2 when differences are found - this is expected
            if (execError.code === 2 && execError.stdout) {
               migraDiff = execError.stdout
               migraStderr = execError.stderr
            } else {
               console.log(chalk.red(`Migra command failed with exit code: ${execError.code}`))
               console.log(chalk.red(`Migra stdout: ${execError.stdout || 'none'}`))
               console.log(chalk.red(`Migra stderr: ${execError.stderr || 'none'}`))
               throw execError
            }
         }

         if (!migraDiff.trim()) {
            spinner.succeed('No changes detected')
            return
         }

         if (options.dryRun) {
            spinner.succeed('Migration preview:')
            console.log(migraDiff)
            return
         }

         spinner.text = 'Writing migration file...'
         // Generate timestamp in format: YYYYMMDDHHMMSS
         const now = new Date()
         const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0')

         const migrationName = options.name
            ? `${timestamp}_${options.name.replace(/\s+/g, '_').toLowerCase()}`
            : `${timestamp}_autogen`

         const migrationPath = join('/app/kyra/migrations', `${migrationName}.sql`)
         const migrationContent = `-- Migration: ${migrationName}
-- Generated at: ${new Date().toISOString()}

${migraDiff}`

         await writeFile(migrationPath, migrationContent)

         await apply()

         spinner.succeed(`Generated: ${migrationName}.sql`)
      } finally {
         await db.dropDatabase(shadowDbName)
      }
   } catch (error: any) {
      spinner.fail('Migration failed')
      console.error(chalk.red('Error:'), error?.message || error)

      if (error?.message?.includes('migra') || error?.code === 'ENOENT') {
         console.error(chalk.yellow('Hint: This might be a migra command issue.'))
      }

      process.exit(1)
   }
}
