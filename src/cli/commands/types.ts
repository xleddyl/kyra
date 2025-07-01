import chalk from 'chalk'
import { exec } from 'child_process'
import { access, mkdir, writeFile } from 'fs/promises'
import ora from 'ora'
import { dirname } from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface TypesOptions {
   output?: string
   connectionString?: string
}

export async function types(options: TypesOptions = {}) {
   const spinner = ora('Generating types...').start()

   try {
      const schemaOutput = options.output || './types/generated/database-schema.graphql'
      const typesOutput = './types/generated/types.ts'
      const codegenConfig = './types/codegen.yml'
      const connectionString = options.connectionString || process.env.DATABASE_URL

      // Create output directories
      await mkdir(dirname(schemaOutput), { recursive: true })
      await mkdir(dirname(typesOutput), { recursive: true })

      // Create codegen config if it doesn't exist
      if (!(await fileExists(codegenConfig))) {
         await mkdir(dirname(codegenConfig), { recursive: true })
         const codegenContent = `overwrite: true
schema: '${schemaOutput}'
generates:
  ${typesOutput}:
    plugins:
      - typescript
      - typescript-operations
    config:
      withHOC: false
      withComponent: false
      withMutationFn: false
      scalars:
        DateTime: 'string'
        JSON: '{ [key: string]: any }'
`
         await writeFile(codegenConfig, codegenContent)
      }

      // Generate schema using PostGraphile
      try {
         await execAsync(`
        yarn postgraphile \\
          --append-plugins @graphile-contrib/pg-simplify-inflector \\
          --schema public,api,private,auth \\
          --export-schema-graphql ${schemaOutput} \\
          -c "${connectionString}" \\
          -M \\
          -X
      `)
      } catch (error: any) {
         if (error?.message?.includes('not found') || error?.message?.includes('No such file')) {
            spinner.fail('PostGraphile not found')
            console.error(chalk.red('Install postgraphile: yarn global add postgraphile'))
            return
         }
         throw error
      }

      // Generate types using GraphQL CodeGen
      try {
         await execAsync(`yarn graphql-codegen --config ${codegenConfig}`)
      } catch (error: any) {
         if (error?.message?.includes('graphql-codegen')) {
            spinner.fail('GraphQL CodeGen not found')
            console.error(
               chalk.red(
                  'Install codegen: yarn global add @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations'
               )
            )
            return
         }
         throw error
      }

      spinner.succeed('Types generated')
   } catch (error: any) {
      spinner.fail('Type generation failed')
      console.error(chalk.red('Error:'), error?.message || error)
      process.exit(1)
   }
}

async function fileExists(filePath: string): Promise<boolean> {
   try {
      await access(filePath)
      return true
   } catch {
      return false
   }
}
