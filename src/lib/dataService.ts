import { gql } from '@apollo/client';
import { apolloClient } from './apolloClient';
import { db } from '../db';

export const isCloud = !!(import.meta as any).env.VITE_GRAPHQL_URL;

// GraphQL Queries & Mutations

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
  async addBooking(booking: any) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_BOOKING,
        variables: { input: booking }
      });
      const newBooking = (data as any)?.createBooking;
      await (db as any).bookings.put(newBooking);
      return newBooking;
    } catch (error) {
      console.error('GraphQL Add failed:', error);
      const localId = await (db as any).bookings.add(booking);
      return { ...booking, id: localId };
    }
  },

  async updateBooking(id: any, updates: any) {
    try {
      const { data } = await apolloClient.mutate({
        mutation: gql`
          mutation UpdateBooking($id: ID!, $input: BookingInput!) {
            updateBooking(id: $id, input: $input) {
              id tenantId guestName guestEmail guestPhone city room
              checkIn checkOut nights nightPrice totalPrice tax deposit remaining
              status notes createdAt updatedAt
            }
          }
        `,
        variables: { id, input: updates }
      });
      const updated = (data as any)?.updateBooking;
      if (updated) await (db as any).bookings.put(updated);
      return updated;
    } catch (error) {
      console.error('Update failed:', error);
      await (db as any).bookings.update(id, updates);
      return null;
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
