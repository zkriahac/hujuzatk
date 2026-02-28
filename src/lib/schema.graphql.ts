// This is a reference for your backend implementation.
// In a real Vite environment, the frontend calls a GraphQL API.

export const typeDefs = `
  enum BookingStatus {
    UPCOMING
    ACTIVE
    COMPLETED
    CANCELED
    NO_SHOW
  }

  enum SubscriptionStatus {
    TRIAL
    ACTIVE
    EXPIRED
    CANCELED
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
  }

  type Tenant {
    id: ID!
    name: String!
    email: String!
    language: String!
    currency: String!
    timezone: String!
    rooms: JSON!
    subscriptionStatus: SubscriptionStatus!
    validUntil: DateTime!
    isAdmin: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    bookingsCount: Int!
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

  type Query {
    me: Tenant
    getBookings(filter: BookingFilter, limit: Int, offset: Int, sortBy: String, sortOrder: String): [Booking!]!
    getBooking(id: ID!): Booking
    getBookingsByDateRange(startDate: DateTime!, endDate: DateTime!): [Booking!]!
    getBookingsByRoom(room: String!): [Booking!]!
    getTenant(id: ID!): Tenant
    getAllTenants: [Tenant!]!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    
    createBooking(input: BookingInput!): Booking!
    updateBooking(id: ID!, input: BookingInput!): Booking!
    deleteBooking(id: ID!): Boolean!
    bulkImportBookings(bookings: [BookingInput!]!): [Booking!]!
    bulkDeleteBookings(ids: [ID!]!): Boolean!
    
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
    updateTenantSettings(id: ID!, input: TenantSettingsInput!): TenantSettings!
    addRoom(tenantId: ID!, room: RoomInput!): Tenant!
    removeRoom(tenantId: ID!, roomId: String!): Tenant!
  }

  input RegisterInput {
    email: String!
    name: String!
    password: String!
    currency: String
    timezone: String
    language: String
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
    guestName: String
    startDate: DateTime
    endDate: DateTime
  }

  input UpdateTenantInput {
    name: String
    language: String
    currency: String
    timezone: String
    rooms: JSON
    subscriptionStatus: SubscriptionStatus
    validUntil: DateTime
  }

  input TenantSettingsInput {
    defaultNightPrice: Float
    defaultTax: Float
    notifyOnBooking: Boolean
    notifyOnCancellation: Boolean
  }

  input RoomInput {
    id: String!
    name: String!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    tenant: Tenant!
  }

  scalar DateTime
  scalar JSON
`;
