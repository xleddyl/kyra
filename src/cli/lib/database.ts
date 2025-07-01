import chalk from 'chalk'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { Client } from 'pg'

export class DatabaseManager {
   async createClient(database?: string): Promise<Client> {
      let connectionString = process.env.DATABASE_URL
      if (database && connectionString) {
         // Replace database name in connection string
         connectionString = connectionString.replace(/\/[^\/]*$/, `/${database}`)
      }
      const client = new Client({ connectionString })
      await client.connect()
      return client
   }

   async databaseExists(name: string): Promise<boolean> {
      const client = await this.createClient('postgres')
      try {
         const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
         return result.rows.length > 0
      } finally {
         await client.end()
      }
   }

   async createDatabase(name: string): Promise<void> {
      const client = await this.createClient('postgres')
      try {
         await client.query(`CREATE DATABASE "${name}"`)
      } finally {
         await client.end()
      }
   }

   async dropDatabase(name: string): Promise<void> {
      const client = await this.createClient('postgres')
      try {
         await client.query(`DROP DATABASE IF EXISTS "${name}"`)
      } finally {
         await client.end()
      }
   }

   async applySqlFiles(directory: string, database?: string): Promise<void> {
      // Check multiple possible paths for the directory
      const possiblePaths = [
         `/app/kyra/${directory.replace('./', '')}`,
         directory,
         `../${directory}`,
      ]

      let actualPath = directory
      let dirExists = false

      for (const path of possiblePaths) {
         if (await this.directoryExists(path)) {
            actualPath = path
            dirExists = true
            break
         }
      }

      if (!dirExists) {
         return
      }

      const files = await readdir(actualPath)
      const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort()

      if (sqlFiles.length === 0) {
         return
      }

      const client = await this.createClient(database)
      try {
         for (const file of sqlFiles) {
            const filePath = join(actualPath, file)
            const sql = await readFile(filePath, 'utf8')

            console.log(chalk.blue(`📄 Applying: ${file}`))
            await client.query(sql)
            console.log(chalk.green(`✓ Applied: ${file}`))
         }
      } finally {
         await client.end()
      }
   }

   async applySingleSqlFile(fileName: string, directory: string, database?: string): Promise<void> {
      // Check multiple possible paths for the directory
      const possiblePaths = [
         `/app/kyra/${directory.replace('./', '')}`,
         directory,
         `../${directory}`,
      ]

      let actualPath = directory
      let dirExists = false

      for (const path of possiblePaths) {
         if (await this.directoryExists(path)) {
            actualPath = path
            dirExists = true
            break
         }
      }

      if (!dirExists) {
         throw new Error(`Directory not found: ${directory}. Tried: ${possiblePaths.join(', ')}`)
      }

      const filePath = join(actualPath, fileName)
      const sql = await readFile(filePath, 'utf8')

      const client = await this.createClient(database)
      try {
         await client.query(sql)
      } finally {
         await client.end()
      }
   }

   async setupMigrationTable(database?: string): Promise<void> {
      const client = await this.createClient(database)
      try {
         await client.query(`
            CREATE SCHEMA IF NOT EXISTS kyra;
            CREATE TABLE IF NOT EXISTS kyra._kyra_migrations (
              id SERIAL PRIMARY KEY,
              filename VARCHAR(255) UNIQUE NOT NULL,
              applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
         `)
      } finally {
         await client.end()
      }
   }

   async getAppliedMigrations(database?: string): Promise<string[]> {
      const client = await this.createClient(database)
      try {
         const result = await client.query(
            'SELECT filename FROM kyra._kyra_migrations ORDER BY applied_at'
         )
         return result.rows.map((row) => row.filename)
      } finally {
         await client.end()
      }
   }

   async markMigrationApplied(filename: string, database?: string): Promise<void> {
      const client = await this.createClient(database)
      try {
         await client.query(
            'INSERT INTO kyra._kyra_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            [filename]
         )
      } finally {
         await client.end()
      }
   }

   async executeQuery(query: string, database?: string): Promise<any> {
      const client = await this.createClient(database)
      try {
         return await client.query(query)
      } finally {
         await client.end()
      }
   }

   private async directoryExists(directory: string): Promise<boolean> {
      try {
         const { stat } = await import('fs/promises')
         const stats = await stat(directory)
         return stats.isDirectory()
      } catch {
         return false
      }
   }
}
