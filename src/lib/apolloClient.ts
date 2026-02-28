import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  concat,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

// ============= ERROR HANDLING =============

const errorLink = onError(({ graphQLErrors, networkError }: any) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions, locations, path }: any) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );

      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear auth tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/user/login';
      }

      if (extensions?.code === 'FORBIDDEN') {
        // Handle authorization errors
        console.error('Access denied');
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Token might be expired, try refresh
      localStorage.removeItem('authToken');
      window.location.href = '/user/login';
    }
  }
});

// ============= AUTHENTICATION LINK =============

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('authToken');
  
  // DEBUG: Log token status
  if (!token && operation.operationName !== 'Login' && operation.operationName !== 'Register') {
    console.warn('⚠️ No auth token for operation:', operation.operationName);
  }

  // Set authorization header in the context
  operation.setContext(({ headers = {} }) => {
    const newHeaders = {
      ...headers,
      'content-type': 'application/json',
    };
    
    // Add authorization header if token exists
    if (token) {
      newHeaders['authorization'] = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    }
    
    return { headers: newHeaders };
  });

  return forward(operation);
});

// ============= HTTP LINK =============

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
  credentials: 'include', // Send cookies with requests
});

// ============= APOLLO CLIENT INSTANCE =============

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        getBookings: {
          keyArgs: ['filter', 'sortBy', 'sortOrder'],
          merge(_existing: any, incoming: any) {
            return incoming;
          },
        },
        getBookingsByDateRange: {
          keyArgs: ['startDate', 'endDate'],
          merge(_existing: any, incoming: any) {
            return incoming;
          },
        },
      },
    },
    Booking: {
      keyFields: ['id'],
    },
    Tenant: {
      keyFields: ['id'],
    },
  },
});

export const apolloClient = new ApolloClient({
  link: concat(errorLink, concat(authLink, httpLink)),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export { GRAPHQL_URL };
