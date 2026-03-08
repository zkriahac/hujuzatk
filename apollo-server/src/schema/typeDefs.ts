import { gql } from 'apollo-server-express';

const typeDefs = gql`
  # ============= SCALARS & ENUMS =============

  scalar DateTime
  scalar JSON

  enum SubscriptionStatus {
    TRIAL
    ACTIVE
    EXPIRED
    CANCELED
  }

  enum BookingStatus {
    UPCOMING
    ACTIVE
    COMPLETED
    CANCELED
    NO_SHOW
  }

  enum AuditAction {
    BOOKING_CREATED
    BOOKING_UPDATED
    BOOKING_DELETED
    TENANT_UPDATED
  }

  # ============= TYPES =============

  type Room {
    id: String!
    name: String!
  }

  type Tenant {
    id: ID!
    name: String!
    email: String!
    language: String!
    currency: String!
    timezone: String!
    rooms: [Room!]!
    subscriptionStatus: SubscriptionStatus!
    validUntil: DateTime!
    isAdmin: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    bookingsCount: Int! # Convenience field
    settings: TenantSettings
  }

  type TenantSettings {
    id: ID!
    defaultNightPrice: Float!
    defaultTax: Float!
    notifyOnBooking: Boolean!
    notifyOnCancellation: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Booking {
    id: ID!
    tenantId: String!
    guestName: String!
    guestEmail: String
    guestPhone: String
    city: String
    room: String!
    checkIn: DateTime!
    checkOut: DateTime!
    nights: Int!
    nightPrice: Float!
    totalPrice: Float!
    tax: Float!
    deposit: Float!
    remaining: Float!
    status: BookingStatus!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String
  }

  type AuditLog {
    id: ID!
    tenantId: String!
    action: AuditAction!
    entityType: String!
    entityId: String!
    changes: JSON
    userId: String
    ipAddress: String
    createdAt: DateTime!
  }

  type Payment {
    id: ID!
    tenantId: String!
    amount: Float!
    currency: String!
    status: String!
    transactionId: String
    planType: String!
    planDays: Int!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OccupancyReport {
    room: String!
    month: String!
    totalNights: Int!
    occupiedNights: Int!
    occupancyRate: Float!
  }

  type RevenueReport {
    year: Int!
    month: Int
    totalRevenue: Float!
    totalDeposits: Float!
    totalOutstanding: Float!
    bookingCount: Int!
    averageBookingValue: Float!
  }

  type GuestStatistics {
    totalGuests: Int!
    uniqueCities: Int!
    averageNightStay: Float!
    repeatGuestRate: Float!
    cancellationRate: Float!
  }

  # ============= AUTH TYPES =============

  type AuthPayload {
    token: String!
    refreshToken: String!
    tenant: Tenant!
  }

  # ============= QUERY ROOT =============

  type Query {
    # Auth
    me: Tenant

    # Tenant
    getTenant(id: ID!): Tenant
    getAllTenants: [Tenant!]! # Admin only

    # Bookings
    getBookings(
      filter: BookingFilter
      limit: Int
      offset: Int
      sortBy: String
      sortOrder: String
    ): [Booking!]!
    
    getBooking(id: ID!): Booking
    
    getBookingsByDateRange(
      startDate: DateTime!
      endDate: DateTime!
    ): [Booking!]!
    
    getBookingsByRoom(room: String!): [Booking!]!

    # Reports
    getOccupancyReport(room: String, year: Int!, month: Int!): OccupancyReport!
    
    getRevenueReport(year: Int!, month: Int): RevenueReport!
    
    getGuestStatistics: GuestStatistics!

    # Audit
    getAuditLogs(
      limit: Int
      offset: Int
      action: AuditAction
    ): [AuditLog!]!

    # Health
    health: String!
  }

  # ============= MUTATION ROOT =============

  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!

    # Tenant Management
    updateTenant(input: UpdateTenantInput!): Tenant!
    updateTenantSettings(input: UpdateTenantSettingsInput!): TenantSettings!
    addRoom(name: String!): Tenant!
    removeRoom(roomId: String!): Tenant!

    # Booking Management
    createBooking(input: BookingInput!): Booking!
    updateBooking(id: ID!, input: BookingInput!): Booking!
    deleteBooking(id: ID!): Boolean!
    
    # Bulk operations
    bulkImportBookings(bookings: [BookingInput!]!): [Booking!]!
    bulkDeleteBookings(ids: [ID!]!): Boolean!

    # Admin
    createAdminSubscription(tenantId: ID!, days: Int!): Tenant! # Admin only
    cancelSubscription(tenantId: ID!): Boolean! # Admin only
  }

  # ============= INPUT TYPES =============

  input RegisterInput {
    email: String!
    name: String!
    password: String!
    currency: String
    timezone: String
    language: String
  }

  input UpdateTenantInput {
    name: String
    language: String
    currency: String
    timezone: String
  }

  input UpdateTenantSettingsInput {
    defaultNightPrice: Float
    defaultTax: Float
    notifyOnBooking: Boolean
    notifyOnCancellation: Boolean
  }

  input BookingInput {
    guestName: String!
    guestEmail: String
    guestPhone: String
    city: String
    room: String!
    checkIn: DateTime!
    checkOut: DateTime!
    nightPrice: Float!
    deposit: Float!
    notes: String
    status: BookingStatus
  }

  input BookingFilter {
    status: BookingStatus
    room: String
    startDate: DateTime
    endDate: DateTime
    guestName: String
  }

  # ============= SUBSCRIPTION ROOT (for real-time updates) =============

  type Subscription {
    bookingCreated(tenantId: ID!): Booking!
    bookingUpdated(tenantId: ID!): Booking!
    bookingDeleted(tenantId: ID!): ID!
  }
`;

export default typeDefs;
