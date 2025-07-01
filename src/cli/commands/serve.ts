import chalk from 'chalk'
import { exec, spawn } from 'child_process'
import ora from 'ora'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function serve() {
   console.log(chalk.blue('🔄 Initializing Kyra Combined...'))

   try {
      // Set Nuxt environment variables from DATABASE_URL
      if (process.env.DATABASE_URL) {
         process.env.NUXT_DATABASE_URL = process.env.DATABASE_URL
         process.env.NUXT_PUBLIC_DATABASE_URL = process.env.DATABASE_URL
      }

      // Wait for database to be ready using connection string
      const spinner = ora('Waiting for database...').start()
      let dbReady = false
      let attempts = 0
      const maxAttempts = 30
      const connectionString =
         process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/postgres'

      while (!dbReady && attempts < maxAttempts) {
         try {
            // Parse connection string to get host, port, user for pg_isready
            const url = new URL(connectionString)
            const host = url.hostname
            const port = url.port || '5432'
            const user = url.username

            await execAsync(`pg_isready -h ${host} -p ${port} -U ${user}`)
            dbReady = true
            spinner.succeed('Database is ready')
         } catch {
            attempts++
            await new Promise((resolve) => setTimeout(resolve, 2000))
         }
      }

      if (!dbReady) {
         spinner.fail('Database connection timeout')
         process.exit(1)
      }

      console.log(chalk.green('🚀 Starting Kyra Backend and Web with PM2...'))
      console.log(chalk.blue('📡 GraphQL API: http://localhost:4000/graphql'))
      console.log(chalk.blue('🔍 GraphiQL IDE: http://localhost:4000/graphiql'))
      console.log(chalk.blue('🌐 Web Interface: http://localhost:3000'))
      console.log()

      // Start PM2 with ecosystem config
      const pm2Process = spawn('pm2-runtime', ['start', '/app/ecosystem.config.cjs'], {
         stdio: 'inherit',
         cwd: '/app',
      })

      pm2Process.on('error', (error) => {
         console.error(chalk.red('PM2 Error:'), error.message)
         process.exit(1)
      })

      pm2Process.on('exit', (code) => {
         console.log(chalk.yellow(`PM2 process exited with code ${code}`))
         process.exit(code || 0)
      })

      // Handle shutdown signals
      process.on('SIGTERM', () => {
         console.log(chalk.yellow('🛑 Received SIGTERM, shutting down...'))
         pm2Process.kill('SIGTERM')
      })

      process.on('SIGINT', () => {
         console.log(chalk.yellow('🛑 Received SIGINT, shutting down...'))
         pm2Process.kill('SIGINT')
      })
   } catch (error) {
      console.error(
         chalk.red('Serve Error:'),
         error instanceof Error ? error.message : String(error)
      )
      process.exit(1)
   }
}
