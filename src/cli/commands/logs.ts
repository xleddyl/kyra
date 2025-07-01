import chalk from 'chalk'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface LogsOptions {
   follow?: boolean
   tail?: string
   service?: string
}

export async function logs(options: LogsOptions = {}) {
   try {
      const args = ['compose', 'logs']
      
      if (options.follow) {
         args.push('-f')
      }
      
      if (options.tail) {
         args.push('--tail', options.tail)
      } else if (!options.follow) {
         args.push('--tail', '100')
      }
      
      if (options.service) {
         args.push(options.service)
      }

      console.log(chalk.blue(options.follow ? '📜 Following logs (Ctrl+C to exit)...' : '📜 Showing recent logs...'))
      
      // Use spawn for streaming logs
      const child = spawn('docker', args, {
         stdio: 'inherit',
         cwd: process.cwd()
      })
      
      child.on('error', (error) => {
         console.error(chalk.red('Error:'), error.message)
         process.exit(1)
      })
      
      child.on('exit', (code) => {
         if (code !== 0) {
            console.error(chalk.red(`Logs command exited with code ${code}`))
            process.exit(code || 1)
         }
      })
      
   } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error))
      process.exit(1)
   }
}