import { readFileSync } from 'fs';

// Copy-paste the SDL from the old typeDefs (prohost-server/src/schema/typeDefs.ts)
export const typeDefs = `
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
    TENANT_INTEGRATIONS_TOGGLED
  }

  type Room {
    id: String!
    name: String!
  }

  type Tenant {
    id: ID!
    name: String!
    email: String!
    phone: String
    language: String!
    currency: String!
    timezone: String!
    rooms: [Room!]!
    subscriptionStatus: SubscriptionStatus!
    validUntil: DateTime!
    isAdmin: Boolean!
    isActive: Boolean!
    integrationsEnabled: Boolean!
    onboardedAt: DateTime
    plan: String!
    maxRooms: Int!
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
    companyName: String
    companyAddress: String
    companyPhone: String
    companyEmail: String
    companyTaxId: String
    companyLogoUrl: String
    invoiceFooter: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Booking {
    id: ID!
    tenantId: String!
    bookingNumber: Int
    guestName: String!
    guestEmail: String
    guestPhone: String
    guestIdNumber: String
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
    source: String
    notes: String
    externalChannel: String
    externalUrl: String
    externalReservationId: String
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

  type RoomMonthOccupancy {
    roomId: String!
    roomName: String!
    year: Int!
    month: Int!
    occupiedNights: Int!
    totalNights: Int!
    occupancyRate: Float!
  }

  type GlobalSettings {
    defaultLanguage: String!
    defaultCurrency: String!
    defaultTimezone: String!
    defaultRooms: [Room!]!
    defaultTrialDays: Int!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    tenant: Tenant!
  }

  type ChannelIntegration {
    id: ID!
    channelName: String!
    roomId: String!
    icalUrlMasked: String!
    label: String
    isActive: Boolean!
    syncBlocks: Boolean!
    syncLookbackDays: Int
    lastSyncedAt: DateTime
    lastSyncStatus: String
    lastSyncMessage: String
    lastSyncCount: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SyncResult {
    integrationId: ID!
    channelName: String!
    roomId: String!
    imported: Int!
    updated: Int!
    canceled: Int!
    skipped: Int!
    blocksRemoved: Int!
    errors: [String!]!
    success: Boolean!
    message: String!
  }

  input SaveChannelIntegrationInput {
    id: ID
    channelName: String!
    roomId: String!
    icalUrl: String!
    label: String
    isActive: Boolean
    syncBlocks: Boolean
    syncLookbackDays: Int
  }

  type Expense {
    id: ID!
    tenantId: String!
    roomId: String
    date: DateTime!
    amount: Float!
    category: String!
    reason: String!
    notes: String
    createdBy: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input ExpenseInput {
    roomId: String
    date: DateTime!
    amount: Float!
    category: String!
    reason: String!
    notes: String
  }

  input UpdateExpenseInput {
    roomId: String
    date: DateTime
    amount: Float
    category: String
    reason: String
    notes: String
  }

  type Query {
    me: Tenant
    getTenant(id: ID!): Tenant
    getAllTenants: [Tenant!]!
    getChannelIntegrations: [ChannelIntegration!]!
    # Returns the full (unmasked) iCal URL for an integration owned by the
    # authenticated tenant. The list query masks it for safety; this single
    # accessor exists so the edit modal can prefill the input instead of
    # forcing users to paste the URL from scratch.
    getChannelIntegrationUrl(id: ID!): String!
    getBookings(filter: BookingFilter, limit: Int, offset: Int, sortBy: String, sortOrder: String): [Booking!]!
    getBooking(id: ID!): Booking
    getBookingsByDateRange(startDate: DateTime!, endDate: DateTime!, mode: String): [Booking!]!
    getBookingsByRoom(room: String!): [Booking!]!
    getYearlyOccupancy(year: Int!): [RoomMonthOccupancy!]!
    getAuditLogs(limit: Int, offset: Int, action: AuditAction): [AuditLog!]!
    getGlobalSettings: GlobalSettings!
    getExpenses(startDate: DateTime, endDate: DateTime, roomId: String): [Expense!]!
    health: String!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!
    requestPasswordReset(email: String!): Boolean!
    resetPassword(token: String!, newPassword: String!): Boolean!
    updateTenant(input: UpdateTenantInput!): Tenant!
    updateTenantSettings(input: UpdateTenantSettingsInput!): TenantSettings!
    addRoom(name: String!): Tenant!
    removeRoom(roomId: String!): Tenant!
    createBooking(input: BookingInput!): Booking!
    updateBooking(id: ID!, input: UpdateBookingInput!): Booking!
    deleteBooking(id: ID!): Boolean!
    bulkImportBookings(bookings: [BookingInput!]!): [Booking!]!
    bulkDeleteBookings(ids: [ID!]!): Int!
    # Optional `plan` lets a super-admin grant time AND set the tier in one
    # atomic call. Without it, plan/maxRooms/integrationsEnabled are left
    # untouched (legacy behaviour — caller is responsible for adminSetPlan).
    createAdminSubscription(tenantId: ID!, days: Int!, plan: String): Tenant!
    cancelSubscription(tenantId: ID!): Boolean!
    adminUpdateTenant(tenantId: ID!, input: UpdateTenantInput!): Tenant!
    adminLoginAs(tenantId: ID!): AuthPayload!
    adminDeactivateTenant(tenantId: ID!): Boolean!
    adminDeleteTenant(tenantId: ID!): Boolean!
    updateGlobalSettings(input: UpdateGlobalSettingsInput!): GlobalSettings!
    saveChannelIntegration(input: SaveChannelIntegrationInput!): ChannelIntegration!
    deleteChannelIntegration(id: ID!): Boolean!
    syncChannel(id: ID!, mode: String): SyncResult!
    syncAllChannels(mode: String): [SyncResult!]!
    adminSetIntegrationsEnabled(tenantId: ID!, enabled: Boolean!): Tenant!
    adminSetPlan(tenantId: ID!, plan: String!): Tenant!
    completeOnboarding: Tenant!
    createExpense(input: ExpenseInput!): Expense!
    updateExpense(id: ID!, input: UpdateExpenseInput!): Expense!
    deleteExpense(id: ID!): Boolean!
  }

  input RegisterInput {
    email: String!
    name: String!
    password: String!
    phone: String
    currency: String
    timezone: String
    language: String
  }

  input RoomInput {
    id: String!
    name: String!
  }

  input UpdateTenantInput {
    name: String
    language: String
    currency: String
    timezone: String
    rooms: [RoomInput!]
  }

  input UpdateTenantSettingsInput {
    defaultNightPrice: Float
    defaultTax: Float
    notifyOnBooking: Boolean
    notifyOnCancellation: Boolean
    companyName: String
    companyAddress: String
    companyPhone: String
    companyEmail: String
    companyTaxId: String
    companyLogoUrl: String
    invoiceFooter: String
  }

  input BookingInput {
    guestName: String!
    guestEmail: String
    guestPhone: String
    guestIdNumber: String
    city: String
    room: String!
    checkIn: DateTime!
    checkOut: DateTime!
    nightPrice: Float!
    deposit: Float!
    source: String
    notes: String
    status: BookingStatus
  }

  input UpdateBookingInput {
    guestName: String
    guestEmail: String
    guestPhone: String
    guestIdNumber: String
    city: String
    room: String
    checkIn: DateTime
    checkOut: DateTime
    nightPrice: Float
    deposit: Float
    source: String
    notes: String
    status: BookingStatus
  }

  input UpdateGlobalSettingsInput {
    defaultLanguage: String
    defaultCurrency: String
    defaultTimezone: String
    defaultRooms: [RoomInput!]
    defaultTrialDays: Int
  }

  input BookingFilter {
    status: BookingStatus
    room: String
    startDate: DateTime
    endDate: DateTime
    guestName: String
    # Channel-sync filters. externalChannel is the canonical value set by
    # performSync ("airbnb" | "gathern" | "booking.com", lowercased). source
    # is user-editable and also covers manually-typed values like "WhatsApp".
    externalChannel: String
    source: String
  }

  type Subscription {
    bookingCreated(tenantId: ID!): Booking!
    bookingUpdated(tenantId: ID!): Booking!
    bookingDeleted(tenantId: ID!): ID!
  }
`;
