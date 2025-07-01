#!/usr/bin/env node
import { apply } from './commands/apply.js'
import { logs } from './commands/logs.js'
import { migrate } from './commands/migrate.js'
import { reset } from './commands/reset.js'
import { serve } from './commands/serve.js'
import { types } from './commands/types.js'
import { Command } from 'commander'

const program = new Command()

program.name('kyra').description('Kyra Database Migration Tool').version('1.0.0')

program
   .command('migrate')
   .description('Generate migrations by comparing schema with current database')
   .option('-n, --name <name>', 'Migration name')
   .option('--dry-run', 'Show what would be migrated without applying')
   .action(migrate)

program
   .command('reset')
   .description('Reset database by applying all migrations and seeds')
   .option('-y, --yes', 'Skip confirmation prompt')
   .action(reset)

program
   .command('apply')
   .description('Apply only new migrations without touching existing data')
   .action(apply)

program
   .command('types')
   .description('Generate TypeScript types from database schema')
   .option('-o, --output <path>', 'Schema output file path')
   .option('-c, --connection-string <string>', 'Database connection string')
   .action(types)

program
   .command('logs')
   .description('View service logs')
   .option('-f, --follow', 'Follow log output')
   .option('--tail <lines>', 'Number of lines to show from end of logs')
   .option('-s, --service <name>', 'Show logs for specific service')
   .action(logs)

program
   .command('serve')
   .description('Start Kyra services within container (internal command)')
   .action(serve)

program.parse()
