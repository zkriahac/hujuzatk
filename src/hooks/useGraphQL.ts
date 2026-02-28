// @ts-ignore - Apollo Client exports are available at runtime despite TS type issues
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import {
  ME_QUERY,
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  GET_BOOKINGS_QUERY,
  GET_BOOKING_QUERY,
  GET_BOOKINGS_BY_DATE_RANGE_QUERY,
  CREATE_BOOKING_MUTATION,
  UPDATE_BOOKING_MUTATION,
  DELETE_BOOKING_MUTATION,
  GET_OCCUPANCY_REPORT_QUERY,
  GET_REVENUE_REPORT_QUERY,
  GET_GUEST_STATISTICS_QUERY,
  BOOKING_CREATED_SUBSCRIPTION,
  BOOKING_UPDATED_SUBSCRIPTION,
} from '../lib/graphql';
import { useCallback } from 'react';

// ============= TYPES =============

interface BookingFilter {
  status?: string;
  room?: string;
  startDate?: string;
  endDate?: string;
  guestName?: string;
}

interface BookingInput {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  city?: string;
  room: string;
  checkIn: string;
  checkOut: string;
  nightPrice: number;
  deposit: number;
  notes?: string;
  status?: string;
}

// ============= AUTH HOOKS =============

export function useMe() {
  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  return {
    tenant: data?.me,
    loading,
    error,
    refetch,
  };
}

export function useLogin() {
  const [login, { loading, error, data }] = useMutation(LOGIN_MUTATION);

  return {
    login: useCallback(
      async (email: string, password: string) => {
        const result = await login({
          variables: { email, password },
        });

        if (result.data?.login) {
          const { token, refreshToken } = result.data.login;
          localStorage.setItem('authToken', token);
          localStorage.setItem('refreshToken', refreshToken);
        }

        return result.data?.login;
      },
      [login]
    ),
    loading,
    error,
    tenant: data?.login?.tenant,
  };
}

export function useRegister() {
  const [register, { loading, error }] = useMutation(REGISTER_MUTATION);

  return {
    register: useCallback(
      async (input: any) => {
        const result = await register({
          variables: { input },
        });

        if (result.data?.register) {
          const { token, refreshToken } = result.data.register;
          localStorage.setItem('authToken', token);
          localStorage.setItem('refreshToken', refreshToken);
        }

        return result.data?.register;
      },
      [register]
    ),
    loading,
    error,
  };
}

// ============= BOOKING HOOKS =============

export function useBookings(filter?: BookingFilter, limit = 100, offset = 0) {
  const { data, loading, error, refetch, fetchMore } = useQuery(
    GET_BOOKINGS_QUERY,
    {
      variables: {
        filter,
        limit,
        offset,
        sortBy: 'checkIn',
        sortOrder: 'desc',
      },
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      skip: !localStorage.getItem('authToken'), // Skip if not authenticated
    }
  );

  return {
    bookings: data?.getBookings || [],
    loading,
    error,
    refetch,
    fetchMore: useCallback(
      (newOffset: number) => {
        return fetchMore({
          variables: {
            offset: newOffset,
          },
        });
      },
      [fetchMore]
    ),
  };
}

export function useBooking(id: string) {
  const { data, loading, error } = useQuery(GET_BOOKING_QUERY, {
    variables: { id },
    skip: !id,
  });

  return {
    booking: data?.getBooking,
    loading,
    error,
  };
}

export function useBookingsByDateRange(startDate: string, endDate: string) {
  const { data, loading, error } = useQuery(GET_BOOKINGS_BY_DATE_RANGE_QUERY, {
    variables: { startDate, endDate },
  });

  return {
    bookings: data?.getBookingsByDateRange || [],
    loading,
    error,
  };
}

export function useCreateBooking() {
  const [createBooking, { loading, error }] = useMutation(
    CREATE_BOOKING_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_BOOKINGS_QUERY,
          variables: {
            filter: {},
            limit: 100,
            offset: 0,
            sortBy: 'checkIn',
            sortOrder: 'desc',
          },
        },
      ],
    }
  );

  return {
    createBooking: useCallback(
      (input: BookingInput) => {
        return createBooking({
          variables: { input },
        }).then((result: any) => result.data?.createBooking);
      },
      [createBooking]
    ),
    loading,
    error,
  };
}

export function useUpdateBooking() {
  const [updateBooking, { loading, error }] = useMutation(
    UPDATE_BOOKING_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_BOOKINGS_QUERY,
          variables: {
            filter: {},
            limit: 100,
            offset: 0,
          },
        },
      ],
    }
  );

  return {
    updateBooking: useCallback(
      (id: string, input: Partial<BookingInput>) => {
        return updateBooking({
          variables: { id, input },
        }).then((result: any) => result.data?.updateBooking);
      },
      [updateBooking]
    ),
    loading,
    error,
  };
}

export function useDeleteBooking() {
  const [deleteBooking, { loading, error }] = useMutation(
    DELETE_BOOKING_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_BOOKINGS_QUERY,
          variables: {
            filter: {},
            limit: 100,
            offset: 0,
          },
        },
      ],
    }
  );

  return {
    deleteBooking: useCallback(
      (id: string) => {
        return deleteBooking({
          variables: { id },
        }).then((result: any) => result.data?.deleteBooking);
      },
      [deleteBooking]
    ),
    loading,
    error,
  };
}

// ============= REPORT HOOKS =============

export function useOccupancyReport(room?: string, year?: number, month?: number) {
  const { data, loading, error } = useQuery(GET_OCCUPANCY_REPORT_QUERY, {
    variables: { room, year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1 },
    skip: !year || !month,
  });

  return {
    report: data?.getOccupancyReport,
    loading,
    error,
  };
}

export function useRevenueReport(year?: number, month?: number) {
  const { data, loading, error } = useQuery(GET_REVENUE_REPORT_QUERY, {
    variables: { year: year || new Date().getFullYear(), month },
    skip: !year,
  });

  return {
    report: data?.getRevenueReport,
    loading,
    error,
  };
}

export function useGuestStatistics() {
  const { data, loading, error } = useQuery(GET_GUEST_STATISTICS_QUERY);

  return {
    statistics: data?.getGuestStatistics,
    loading,
    error,
  };
}

// ============= SUBSCRIPTION HOOKS =============

export function useBookingCreatedSubscription(tenantId?: string) {
  const { data, loading, error } = useSubscription(
    BOOKING_CREATED_SUBSCRIPTION,
    {
      variables: { tenantId: tenantId || '' },
      skip: !tenantId,
    }
  );

  return {
    booking: data?.bookingCreated,
    loading,
    error,
  };
}

export function useBookingUpdatedSubscription(tenantId?: string) {
  const { data, loading, error } = useSubscription(
    BOOKING_UPDATED_SUBSCRIPTION,
    {
      variables: { tenantId: tenantId || '' },
      skip: !tenantId,
    }
  );

  return {
    booking: data?.bookingUpdated,
    loading,
    error,
  };
}

// ============= COMBINED HOOKS =============

export function useBookingManager(filter?: BookingFilter) {
  const { bookings, loading: bookingsLoading, error: bookingsError, refetch } = useBookings(filter);
  const { createBooking, loading: createLoading } = useCreateBooking();
  const { updateBooking, loading: updateLoading } = useUpdateBooking();
  const { deleteBooking, loading: deleteLoading } = useDeleteBooking();

  return {
    bookings,
    loading: bookingsLoading || createLoading || updateLoading || deleteLoading,
    error: bookingsError,
    createBooking,
    updateBooking,
    deleteBooking,
    refetch,
  };
}
