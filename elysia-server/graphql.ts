import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLError } from 'graphql';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './context';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const isDev = process.env.NODE_ENV === 'development';

export const yoga = createYoga({
  schema,
  context: ({ request }) => createContext(request, undefined),
  graphqlEndpoint: '/graphql',
  maskedErrors: {
    maskError(error, message) {
      // Pass through GraphQLErrors with known codes (auth, validation, not found, etc.)
      if (error instanceof GraphQLError && error.extensions?.code) {
        return error;
      }
      // In development, expose the raw error for easier debugging
      if (isDev && error instanceof Error) {
        return new GraphQLError(error.message, { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
      }
      return new GraphQLError(message, { extensions: { code: 'INTERNAL_SERVER_ERROR' } });
    },
  },
  logging: isDev ? 'debug' : 'warn',
});
