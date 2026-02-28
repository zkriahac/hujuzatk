import { gql } from '@apollo/client';

// ============= AUTH QUERIES & MUTATIONS =============

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      language
      currency
      timezone
      rooms {
        id
        name
      }
      subscriptionStatus
      validUntil
      isAdmin
      isActive
      createdAt
      bookingsCount
      settings {
        defaultNightPrice
        defaultTax
        notifyOnBooking
        notifyOnCancellation
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      refreshToken
      tenant {
        id
        name
        email
        language
        currency
        timezone
        rooms {
          id
          name
        }
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      tenant {
        id
        name
        email
        language
        currency
        timezone
        rooms {
          id
          name
        }
        bookingsCount
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
      tenant {
        id
        name
      }
    }
  }
`;

// ============= BOOKING QUERIES =============

export const GET_BOOKINGS_QUERY = gql`
  query GetBookings(
    $filter: BookingFilter
    $limit: Int
    $offset: Int
    $sortBy: String
    $sortOrder: String
  ) {
    getBookings(
      filter: $filter
      limit: $limit
      offset: $offset
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
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

export const GET_BOOKING_QUERY = gql`
  query GetBooking($id: ID!) {
    getBooking(id: $id) {
      id
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

export const GET_BOOKINGS_BY_DATE_RANGE_QUERY = gql`
  query GetBookingsByDateRange($startDate: DateTime!, $endDate: DateTime!) {
    getBookingsByDateRange(startDate: $startDate, endDate: $endDate) {
      id
      guestName
      room
      checkIn
      checkOut
      nights
      nightPrice
      totalPrice
      status
    }
  }
`;

export const GET_BOOKINGS_BY_ROOM_QUERY = gql`
  query GetBookingsByRoom($room: String!) {
    getBookingsByRoom(room: $room) {
      id
      guestName
      checkIn
      checkOut
      status
      totalPrice
    }
  }
`;

// ============= BOOKING MUTATIONS =============

export const CREATE_BOOKING_MUTATION = gql`
  mutation CreateBooking($input: BookingInput!) {
    createBooking(input: $input) {
      id
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
    }
  }
`;

export const UPDATE_BOOKING_MUTATION = gql`
  mutation UpdateBooking($id: ID!, $input: BookingInput!) {
    updateBooking(id: $id, input: $input) {
      id
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
      updatedAt
    }
  }
`;

export const DELETE_BOOKING_MUTATION = gql`
  mutation DeleteBooking($id: ID!) {
    deleteBooking(id: $id)
  }
`;

export const BULK_IMPORT_BOOKINGS_MUTATION = gql`
  mutation BulkImportBookings($bookings: [BookingInput!]!) {
    bulkImportBookings(bookings: $bookings) {
      id
      guestName
      room
      checkIn
      checkOut
      totalPrice
      status
    }
  }
`;

export const BULK_DELETE_BOOKINGS_MUTATION = gql`
  mutation BulkDeleteBookings($ids: [ID!]!) {
    bulkDeleteBookings(ids: $ids)
  }
`;

// ============= REPORT QUERIES =============

export const GET_OCCUPANCY_REPORT_QUERY = gql`
  query GetOccupancyReport($room: String, $year: Int!, $month: Int!) {
    getOccupancyReport(room: $room, year: $year, month: $month) {
      room
      month
      totalNights
      occupiedNights
      occupancyRate
    }
  }
`;

export const GET_REVENUE_REPORT_QUERY = gql`
  query GetRevenueReport($year: Int!, $month: Int) {
    getRevenueReport(year: $year, month: $month) {
      year
      month
      totalRevenue
      totalDeposits
      totalOutstanding
      bookingCount
      averageBookingValue
    }
  }
`;

export const GET_GUEST_STATISTICS_QUERY = gql`
  query GetGuestStatistics {
    getGuestStatistics {
      totalGuests
      uniqueCities
      averageNightStay
      repeatGuestRate
      cancellationRate
    }
  }
`;

// ============= TENANT MUTATIONS =============

export const UPDATE_TENANT_MUTATION = gql`
  mutation UpdateTenant($input: UpdateTenantInput!) {
    updateTenant(input: $input) {
      id
      name
      language
      currency
      timezone
      updatedAt
    }
  }
`;

export const UPDATE_TENANT_SETTINGS_MUTATION = gql`
  mutation UpdateTenantSettings($input: UpdateTenantSettingsInput!) {
    updateTenantSettings(input: $input) {
      id
      defaultNightPrice
      defaultTax
      notifyOnBooking
      notifyOnCancellation
    }
  }
`;

export const ADD_ROOM_MUTATION = gql`
  mutation AddRoom($name: String!) {
    addRoom(name: $name) {
      id
      rooms {
        id
        name
      }
    }
  }
`;

export const REMOVE_ROOM_MUTATION = gql`
  mutation RemoveRoom($roomId: String!) {
    removeRoom(roomId: $roomId) {
      id
      rooms {
        id
        name
      }
    }
  }
`;

// ============= AUDIT QUERIES =============

export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs($limit: Int, $offset: Int, $action: AuditAction) {
    getAuditLogs(limit: $limit, offset: $offset, action: $action) {
      id
      action
      entityType
      entityId
      changes
      userId
      createdAt
    }
  }
`;

// ============= SUBSCRIPTIONS =============

export const BOOKING_CREATED_SUBSCRIPTION = gql`
  subscription OnBookingCreated($tenantId: ID!) {
    bookingCreated(tenantId: $tenantId) {
      id
      guestName
      room
      checkIn
      checkOut
      status
      totalPrice
    }
  }
`;

export const BOOKING_UPDATED_SUBSCRIPTION = gql`
  subscription OnBookingUpdated($tenantId: ID!) {
    bookingUpdated(tenantId: $tenantId) {
      id
      guestName
      room
      status
      updatedAt
    }
  }
`;

export const BOOKING_DELETED_SUBSCRIPTION = gql`
  subscription OnBookingDeleted($tenantId: ID!) {
    bookingDeleted(tenantId: $tenantId)
  }
`;
