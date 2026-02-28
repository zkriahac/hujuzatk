import { authResolvers } from './authResolvers';
import { bookingResolvers } from './bookingResolvers';
import { tenantResolvers } from './tenantResolvers';
import { reportResolvers } from './reportResolvers';
import { auditResolvers } from './auditResolvers';

const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...bookingResolvers.Query,
    ...reportResolvers.Query,
    ...auditResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...bookingResolvers.Mutation,
    ...tenantResolvers.Mutation,
  },
} as any; // Use 'as any' to avoid strict type checking for resolver types

export default resolvers;
