import { drizzle } from 'drizzle-orm/node-postgres'

export default defineNuxtPlugin(() => {
   const config = useRuntimeConfig()
   return {
      provide: {
         db: drizzle(config.public.databaseUrl),
      },
   }
})
