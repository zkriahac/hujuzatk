import { v4 as uuidv4 } from 'uuid';
import { db, type Tenant, type SubscriptionStatus } from '../db';
import { supabaseClient, isCloud } from './supabaseClient';

export interface SessionUser {
  tenantId: string;
  tenant: Tenant;
  isAdmin: boolean;
}

const TRIAL_DAYS = 14;
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

function addDaysString(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Convert GraphQL tenant response to local Tenant format
function convertGraphQLTenantToLocal(graphqlTenant: any): Tenant {
  return {
    uuid: graphqlTenant.id,
    email: graphqlTenant.email,
    name: graphqlTenant.name,
    language: graphqlTenant.language || 'en',
    currency: graphqlTenant.currency || 'OMR',
    timezone: graphqlTenant.timezone || 'Asia/Muscat',
    rooms: (graphqlTenant.rooms || []).map((r: any) => ({
      id: r.id || r,
      name: r.name || r,
    })),
    subscriptionStatus: graphqlTenant.subscriptionStatus as SubscriptionStatus,
    validUntil: graphqlTenant.validUntil,
    createdAt: graphqlTenant.createdAt,
    isAdmin: graphqlTenant.isAdmin || false,
  };
}

export const authService = {
  isCloud,

  async getCurrentUser(): Promise<SessionUser | null> {
    // First check for GraphQL token
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `query Me {
              me {
                id
                name
                email
                language
                currency
                timezone
                rooms { id name }
                subscriptionStatus
                validUntil
                isAdmin
                createdAt
              }
            }`,
          }),
        });
        
        const result = await response.json();
        if (result.data?.me) {
          const tenant = convertGraphQLTenantToLocal(result.data.me);
          return {
            tenantId: tenant.uuid,
            tenant,
            isAdmin: !!tenant.isAdmin,
          };
        }
      } catch (err) {
        console.error('Failed to fetch current user from GraphQL:', err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    }

    // Fallback to Supabase
    if (isCloud && supabaseClient) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return null;

      const { data: tenantRow, error } = await supabaseClient
        .from('tenants')
        .select('*')
        .eq('uuid', user.id)
        .single();
      if (error || !tenantRow) return null;

      return {
        tenantId: tenantRow.uuid,
        tenant: tenantRow as Tenant,
        isAdmin: !!tenantRow.isAdmin,
      };
    }

    // Fallback to local Dexie database
    const stored = localStorage.getItem('hotel-pms-session');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { tenantUuid: string };
    const tenant = await db.tenants.where('uuid').equals(parsed.tenantUuid).first();
    if (!tenant) return null;
    return { tenantId: tenant.uuid, tenant, isAdmin: !!tenant.isAdmin };
  },

  async registerLocalTenant(payload: {
    email: string;
    name: string;
    password: string;
  }): Promise<SessionUser> {
    // Try GraphQL registration first
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation Register($input: RegisterInput!) {
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
                rooms { id name }
                subscriptionStatus
                validUntil
                isAdmin
                createdAt
              }
            }
          }`,
          variables: {
            input: {
              email: payload.email,
              name: payload.name,
              password: payload.password,
            },
          },
        }),
      });

      const result = await response.json();
      if (result.data?.register) {
        const { token, refreshToken, tenant: graphqlTenant } = result.data.register;
        localStorage.setItem('authToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        const tenant = convertGraphQLTenantToLocal(graphqlTenant);
        return {
          tenantId: tenant.uuid,
          tenant,
          isAdmin: !!tenant.isAdmin,
        };
      }
      if (result.errors?.[0]) {
        throw new Error(result.errors[0].message);
      }
    } catch (err: any) {
      // Fall back to local registration
      if (!err.message?.includes('Failed to fetch')) {
        throw err;
      }
      console.warn('GraphQL unavailable, falling back to local registration');
    }

    // Fallback: local registration
    const existing = await db.tenants.where('email').equals(payload.email).first();
    if (existing) {
      throw new Error('Email is already registered.');
    }
    
    const count = await db.tenants.count();
    const isAdmin = count === 0 || payload.email === 'admin@admin.com';
    
    const uuid = uuidv4();
    const today = new Date().toISOString().slice(0, 10);
    const tenant: Tenant = {
      uuid,
      email: payload.email,
      name: payload.name,
      language: 'en',
      currency: 'OMR',
      timezone: 'Asia/Muscat',
      rooms: [
        { id: 'A1', name: 'A1' },
        { id: 'A2', name: 'A2' },
        { id: 'A3', name: 'A3' },
        { id: 'A4', name: 'A4' },
        { id: 'A5', name: 'A5' },
      ],
      subscriptionStatus: 'TRIAL',
      validUntil: addDaysString(today, TRIAL_DAYS),
      createdAt: new Date().toISOString(),
      isAdmin,
      passwordHash: btoa(payload.password),
    };
    await db.tenants.add(tenant);
    localStorage.setItem('hotel-pms-session', JSON.stringify({ tenantUuid: uuid }));
    return { tenantId: uuid, tenant, isAdmin: false };
  },

  async loginLocal(email: string, password: string): Promise<SessionUser> {
    // Try GraphQL login first
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation Login($email: String!, $password: String!) {
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
                rooms { id name }
                subscriptionStatus
                validUntil
                isAdmin
                createdAt
              }
            }
          }`,
          variables: { email, password },
        }),
      });

      const result = await response.json();
      
      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message || 'Login failed');
      }
      
      // Handle successful login
      if (result.data?.login) {
        const { token, refreshToken, tenant: graphqlTenant } = result.data.login;
        localStorage.setItem('authToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        const tenant = convertGraphQLTenantToLocal(graphqlTenant);
        return {
          tenantId: tenant.uuid,
          tenant,
          isAdmin: !!tenant.isAdmin,
        };
      }
      
      // If no login data and no errors, something is wrong
      if (!result.data?.login) {
        throw new Error('Invalid email or password');
      }
    } catch (err: any) {
      // Check if it's a network error (GraphQL server down)
      if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_')) {
        console.warn('GraphQL unavailable, cannot login:', err.message);
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      // Re-throw GraphQL errors
      throw err;
    }
    // Fallback - should not reach here if all paths are covered
    throw new Error('Login failed');
  },

  async logout(): Promise<void> {
    if (isCloud && supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('hotel-pms-session');
  },

  async updateTenantConfig(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    // Use GraphQL to update tenant - only send defined fields
    try {
      const input: any = {};
      if (updates.name !== undefined) input.name = updates.name;
      if (updates.language !== undefined) input.language = updates.language;
      if (updates.currency !== undefined) input.currency = updates.currency;
      if (updates.timezone !== undefined) input.timezone = updates.timezone;
      
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({
          query: `mutation UpdateTenant($input: UpdateTenantInput!) {
            updateTenant(input: $input) {
              id
              name
              email
              language
              currency
              timezone
              rooms { id name }
              isAdmin
              createdAt
            }
          }`,
          variables: { input },
        }),
      });

      const result = await response.json();
      if (result.errors?.[0]) {
        throw new Error(result.errors[0].message);
      }
      if (result.data?.updateTenant) {
        const updated = convertGraphQLTenantToLocal(result.data.updateTenant);
        // Update local cache
        const tenant = await db.tenants.where('uuid').equals(tenantId).first();
        if (tenant?.id) {
          await db.tenants.update(tenant.id, {
            name: updated.name,
            language: updated.language,
            currency: updated.currency,
            timezone: updated.timezone,
            rooms: updated.rooms,
            subscriptionStatus: updated.subscriptionStatus,
            validUntil: updated.validUntil,
          });
        }
        return updated;
      }
    } catch (err: any) {
      console.warn('GraphQL update failed:', err);
    }

    // Fallback to Supabase if in cloud mode
    if (isCloud && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('tenants')
        .update(updates)
        .eq('uuid', tenantId)
        .select()
        .single();
      if (error || !data) throw error ?? new Error('Failed to update tenant');
      return data as Tenant;
    }
    
    // Fallback to local DB - get current tenant and return with updates applied
    const tenants = await (db as any).tenants.toArray();
    const tenant = tenants.find((t: any) => t.uuid === tenantId);
    if (tenant?.id) {
      await db.tenants.update(tenant.id, updates);
      return { ...tenant, ...updates } as Tenant;
    }
    
    // If still not found, try to create a minimal tenant entry
    if (tenants.length > 0) {
      // Use the first tenant as fallback (single-tenant app)
      const fallback = tenants[0];
      await db.tenants.update(fallback.id, updates);
      return { ...fallback, ...updates } as Tenant;
    }
    
    throw new Error('Tenant not found in any storage backend');
  },

  async adminListTenants(): Promise<Tenant[]> {
    try {
      // Try to fetch from GraphQL API first
      const { dataService } = await import('./dataService');
      const tenants = await dataService.getAllTenants();
      if (tenants.length > 0) {
        return tenants;
      }
    } catch (error) {
      console.warn('GraphQL fetch failed, falling back to local DB:', error);
    }

    // Fallback to local DB
    if (isCloud && supabaseClient) {
      const { data, error } = await supabaseClient.from('tenants').select('*');
      if (error) throw error;
      return (data || []) as Tenant[];
    }
    return db.tenants.toArray();
  },

  async adminSetSubscriptionStatus(
    tenantUuid: string,
    status: SubscriptionStatus,
    validUntil?: string,
  ): Promise<void> {
    if (isCloud && supabaseClient) {
      const { error } = await supabaseClient
        .from('tenants')
        .update({ subscriptionStatus: status, validUntil })
        .eq('uuid', tenantUuid);
      if (error) throw error;
      return;
    }
    const tenant = await db.tenants.where('uuid').equals(tenantUuid).first();
    if (!tenant) throw new Error('Tenant not found');
    await db.tenants.update(tenant.id!, { subscriptionStatus: status, validUntil });
  },

  async checkWorkspaceExists(slug: string): Promise<boolean> {
    const name = slug.replace(/-/g, ' ');
    if (isCloud && supabaseClient) {
      const { data } = await supabaseClient
        .from('tenants')
        .select('uuid')
        .ilike('name', name)
        .single();
      return !!data;
    }
    const tenant = await db.tenants.where('name').equalsIgnoreCase(name).first();
    return !!tenant;
  },
};
