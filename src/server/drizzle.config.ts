import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
   out: './.drizzle',
   schema: ['./drizzle.ts'],
   dialect: 'postgresql',
   schemaFilter: ['public', 'private', 'auth', 'api'],
   dbCredentials: {
      url: process.env.DATABASE_URL!,
   },
})
