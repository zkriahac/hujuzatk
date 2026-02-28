import { gql } from '@apollo/client';
import { apolloClient } from './apolloClient';
import { db } from '../db';

export const isCloud = !!(import.meta as any).env.VITE_GRAPHQL_URL;

// GraphQL Queries & Mutations
const GET_BOOKINGS = gql`
  query GetBookings {
    getBookings {
      id
      tenantId
      guestName
      guestEmail
      guestPhone
      city
      room
      checkIn
      checkOut
      nights
      nightPrice
      totalPrice
      tax
      deposit
      remaining
      status
      notes
      createdAt
      updatedAt
    }
  }
`;

const CREATE_BOOKING = gql`
  mutation CreateBooking($input: BookingInput!) {
    createBooking(input: $input) {
      id
      tenantId
      guestName
      guestEmail
      guestPhone
      city
      room
      checkIn
      checkOut
      nights
      nightPrice
      totalPrice
      tax
      deposit
      remaining
      status
      notes
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_TENANTS = gql`
  query GetAllTenants {
    getAllTenants {
      id
      name
      email
      language
      currency
      timezone
      subscriptionStatus
      validUntil
      createdAt
      isAdmin
    }
  }
`;

// Data Service using GraphQL
export const dataService = {
  isCloud,
  async getAllBookings(tenantId: string) {
    try {
      const { data } = await apolloClient.query({
        query: GET_BOOKINGS,
        fetchPolicy: 'network-only'
      });
      
      if ((data as any)?.getBookings) {
        const bookings = (data as any).getBookings;
        // Cache bookings locally - use bulkPut to upsert instead of failing on duplicates
        try {
          await (db as any).bookings.where('tenantId').equals(tenantId).delete();
          // Use bulkPut (upsert) instead of bulkAdd (fails on duplicates)
          await (db as any).bookings.bulkPut(bookings);
        } catch (cacheError) {
          console.warn('Failed to cache bookings locally:', cacheError);
          // Continue anyway, return the fetched data
        }
        return bookings;
      }
    } catch (error) {
      console.warn('GraphQL failed, falling back to local DB:', error);
    }
    
    return await (db as any).bookings.where('tenantId').equals(tenantId).toArray();
  },

  async addBooking(booking: any) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_BOOKING,
        variables: { input: booking }
      });
      
      const newBooking = (data as any)?.createBooking;
      
      // Add to local cache
      await (db as any).bookings.add(newBooking);
      
      // Force Apollo cache to refetch by evicting the query
      apolloClient.cache.evict({ fieldName: 'getBookings' });
      apolloClient.cache.gc();
      
      // Explicitly refetch to show booking immediately
      try {
        await apolloClient.query({
          query: GET_BOOKINGS,
          fetchPolicy: 'network-only'
        });
      } catch (refetchError) {
        console.warn('Refetch after add failed:', refetchError);
      }
      
      return newBooking;
    } catch (error) {
      console.error('GraphQL Add failed:', error);
      const localId = await (db as any).bookings.add(booking);
      return { ...booking, id: localId };
    }
  },

  async updateBooking(id: any, updates: any) {
    try {
      await apolloClient.mutate({
        mutation: gql`
          mutation UpdateBooking($id: ID!, $input: BookingInput!) {
            updateBooking(id: $id, input: $input) {
              id
              guestName
              status
            }
          }
        `,
        variables: { id, input: updates }
      });
      
      await (db as any).bookings.update(id, updates);
      
      // Force Apollo cache to refetch
      apolloClient.cache.evict({ fieldName: 'getBookings' });
      apolloClient.cache.gc();
      
      // Explicitly refetch to show update immediately
      try {
        await apolloClient.query({
          query: GET_BOOKINGS,
          fetchPolicy: 'network-only'
        });
      } catch (refetchError) {
        console.warn('Refetch after update failed:', refetchError);
      }
    } catch (error) {
      console.error('Update failed:', error);
      await (db as any).bookings.update(id, updates);
    }
  },

  async deleteBooking(id: any) {
    try {
      await apolloClient.mutate({
        mutation: gql`
          mutation DeleteBooking($id: ID!) {
            deleteBooking(id: $id)
          }
        `,
        variables: { id }
      });
      
      await (db as any).bookings.delete(id);
      
      // Force Apollo cache to refetch
      apolloClient.cache.evict({ fieldName: 'getBookings' });
      apolloClient.cache.gc();
      
      // Explicitly refetch to show deletion immediately
      try {
        await apolloClient.query({
          query: GET_BOOKINGS,
          fetchPolicy: 'network-only'
        });
      } catch (refetchError) {
        console.warn('Refetch after delete failed:', refetchError);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      await (db as any).bookings.delete(id);
    }
  },

  async getAllTenants() {
    try {
      const { data } = await apolloClient.query({
        query: GET_ALL_TENANTS,
        fetchPolicy: 'network-only'
      });
      
      return (data as any)?.getAllTenants || [];
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      return [];
    }
  },

  // Get bookings filtered by date range (for month-based lazy loading)
  async getBookingsByDateRange(startDate: string, endDate: string) {
    try {
      const { data } = await apolloClient.query({
        query: gql`
          query GetBookingsByDateRange($startDate: DateTime!, $endDate: DateTime!) {
            getBookingsByDateRange(startDate: $startDate, endDate: $endDate) {
              id
              tenantId
              guestName
              guestEmail
              guestPhone
              city
              room
              checkIn
              checkOut
              nights
              nightPrice
              totalPrice
              tax
              deposit
              remaining
              status
              notes
              createdAt
              updatedAt
            }
          }
        `,
        variables: { startDate, endDate },
        fetchPolicy: 'network-only'
      });
      
      return (data as any)?.getBookingsByDateRange || [];
    } catch (error) {
      console.warn('Failed to fetch bookings for date range:', error);
      return [];
    }
  }
};
