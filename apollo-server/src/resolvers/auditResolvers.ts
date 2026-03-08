import { AppContext, requireAuth, requireSuperAdmin } from '../context';

export const auditResolvers = {
  Query: {
    async getAuditLogs(
      _: any,
      { limit = 100, offset = 0, action }: { limit?: number; offset?: number; action?: string },
      context: AppContext
    ) {
      requireAuth(context);

      const where: any = {
        tenantId: context.tenantId,
      };

      if (action) {
        where.action = action;
      }

      const logs = await context.prisma.auditLog.findMany({
        where,
        take: Math.min(limit, 500),
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      return logs;
    },

    async health() {
      return 'ok';
    },
  },
};
