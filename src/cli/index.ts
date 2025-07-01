#!/usr/bin/env node
import { apply } from './commands/apply.js'
import { migrate } from './commands/migrate.js'
import { reset } from './commands/reset.js'
import { serve } from './commands/serve.js'
import { Command } from 'commander'

const program = new Command()

program.name('kyra').description('Kyra Database Migration Tool').version('1.0.0')

program
   .command('migrate')
   .description('Generate migrations by comparing schema with current database')
   .option('--name <name>', 'Migration name')
   .option('--dry-run', 'Show what would be migrated without applying')
   .option('--schema <schema>', 'Comma-separated list of schemas to include in migration')
   .action(migrate)

program
   .command('reset')
   .description('Reset database by applying all migrations and seeds')
   .option('--yes', 'Skip confirmation prompt')
   .action(reset)

program
   .command('apply')
   .description('Apply only new migrations without touching existing data')
   .action(apply)

program
   .command('serve')
   .description('Start Kyra services within container (internal command)')
   .action(serve)

program.parse()
