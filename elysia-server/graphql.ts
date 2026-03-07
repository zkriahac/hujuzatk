import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';
import { createContext } from './context';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export const yoga = createYoga({
  schema,
  context: ({ request }) => createContext(request, undefined),
  graphqlEndpoint: '/graphql',
});
