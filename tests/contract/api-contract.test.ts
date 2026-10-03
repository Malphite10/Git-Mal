import { describe, it, expect } from 'vitest';

describe('Core API Contract', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  const routes = [
    '/api/auth/[...nextauth]',
    '/api/tenants',
    '/api/tenants/[id]',
    '/api/service-categories',
    '/api/service-categories/[id]',
    '/api/services',
    '/api/services/[id]',
    '/api/customers',
    '/api/customers/[id]',
    '/api/staff',
    '/api/staff/[id]',
    '/api/bookings',
    '/api/bookings/[id]',
    '/api/bookings/[id]/cancel',
    '/api/tenant-memberships',
    '/api/tenant-memberships/[id]',
    '/api/users',
    '/api/users/[id]',
    '/api/users/[id]/password',
    '/api/audit-logs',
    '/api/audit-logs/entity/[entity]/[id]',
  ];

  it('all documented routes exist (not 404)', async () => {
    const results = await Promise.allSettled(
      routes.map(async (route) => {
        const url = `${BASE_URL}${route}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          return { route, status: res.status };
        } catch {
          return { route, status: 'error' };
        }
      })
    );

    const failures = results
      .map((r, i) => (r.status === 'fulfilled' ? { route: routes[i], status: r.value.status } : { route: routes[i], status: 'error' }))
      .filter(r => r.status === 404 || r.status === 'error');

    if (failures.length > 0) {
      console.log('Route failures:', failures);
    }

    expect(failures.length).toBe(0);
  });

  it('response shapes match contract - paginated endpoints', async () => {
    const paginatedRoutes = [
      '/api/tenants',
      '/api/service-categories',
      '/api/services',
      '/api/customers',
      '/api/staff',
      '/api/bookings',
      '/api/tenant-memberships',
      '/api/users',
      '/api/audit-logs',
    ];

    for (const route of paginatedRoutes) {
      const res = await fetch(`${BASE_URL}${route}?limit=1`);
      expect([200, 401]).toContain(res.status);

      if (res.status === 200) {
        const data = await res.json();
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('meta');
        expect(data.meta).toHaveProperty('total');
        expect(data.meta).toHaveProperty('page');
        expect(data.meta).toHaveProperty('limit');
        expect(data.meta).toHaveProperty('totalPages');
      }
    }
  });

  it('error format matches ApiError contract', async () => {
    // Test an unauthenticated request to a protected route
    const res = await fetch(`${BASE_URL}/api/tenants`);
    expect([401, 403]).toContain(res.status);

    if (res.status === 401 || res.status === 403) {
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('statusCode');
    }
  });

  it('auth endpoint responds', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/[...nextauth]`, { method: 'GET' });
    expect([200, 405]).toContain(res.status);
  });
});