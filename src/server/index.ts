import { default as pgSimplifyInflector } from '@graphile-contrib/pg-simplify-inflector'
import Fastify from 'fastify'
import { PgNodeAliasPostGraphile } from 'graphile-build-pg'
import { postgraphile } from 'postgraphile'
import { PostGraphileResponseFastify3 } from 'postgraphile'

const pgq = postgraphile(process.env.DATABASE_URL, process.env.DATABASE_SCHEMA_EXPOSE.split(','), {
   appendPlugins: [pgSimplifyInflector as any],
   skipPlugins: [PgNodeAliasPostGraphile],
   disableDefaultMutations: true,
   graphiql: true,
   enhanceGraphiql: true,
   disableQueryLog: true,
   watchPg: true,
   retryOnInitFail: true,
})

const convertHandler = (handler) => (request, reply) => {
   return handler(new PostGraphileResponseFastify3(request, reply))
}

export const server = Fastify({
   logger: false,
})

server.options('/graphql', convertHandler(pgq.graphqlRouteHandler))
server.post('/graphql', convertHandler(pgq.graphqlRouteHandler))

server.head('/graphiql', convertHandler(pgq.graphiqlRouteHandler))
server.get('/graphiql', convertHandler(pgq.graphiqlRouteHandler))

const url = await server.listen({
   host: '0.0.0.0',
   port: 4000,
})
console.log(`🚀 Server ready at ${url}`)
