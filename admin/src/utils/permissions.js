/**
 * permissions.js
 * Centralized Role-Based Access Control (RBAC) definitions and validation utilities
 * for CampXChange Admin Console.
 */

export const PERMISSION_CATALOG = [
  // Core
  {
    key: 'dashboard',
    label: 'Dashboard Overview',
    group: 'Core',
    description: 'Executive summary metrics, active KPIs, and platform pulse',
  },
  // Operations
  {
    key: 'listings',
    label: 'Listings & Catalog',
    group: 'Marketplace Operations',
    description: 'Review product listings, manage visibility, and moderate items',
  },
  {
    key: 'deals',
    label: 'Deals & Handovers',
    group: 'Marketplace Operations',
    description: 'Monitor campus trades, inspect handover QR sessions, and resolve disputes',
  },
  {
    key: 'categories',
    label: 'Category Management',
    group: 'Marketplace Operations',
    description: 'Create, reorganize, edit icons, and delete marketplace categories',
  },
  {
    key: 'banners',
    label: 'Banner Slideshow',
    group: 'Marketplace Operations',
    description: 'Manage homepage banner carousel, slide images, call-to-actions, and order',
  },
  {
    key: 'reports',
    label: 'Reports & Content Moderation',
    group: 'Marketplace Operations',
    description: 'Investigate student complaints, resolve flagged items, and manage banned keywords',
  },
  // Community & Verification
  {
    key: 'students',
    label: 'Students & ID Verification',
    group: 'Community & Trust',
    description: 'Student directory, physical college ID lightbox inspection, and badge verification',
  },
  {
    key: 'notifications',
    label: 'Campus Broadcasts',
    group: 'Community & Trust',
    description: 'Dispatch campus-wide emergency broadcasts and direct student warning notices',
  },
  // Monitoring & Governance
  {
    key: 'analytics',
    label: 'Analytics & Growth',
    group: 'System & Governance',
    description: 'Trade volume charts, growth trends, GMV analytics, and seller leaderboards',
  },
  {
    key: 'audit_logs',
    label: 'Audit Trail',
    group: 'System & Governance',
    description: 'Inspect immutable logs of all staff actions, filters, and CSV exports',
  },
  {
    key: 'system_health',
    label: 'System Diagnostics',
    group: 'System & Governance',
    description: 'Real-time database ping, cache latency, storage status, and worker health',
  },
  {
    key: 'team',
    label: 'Staff Team (RBAC)',
    group: 'System & Governance',
    description: 'Manage staff members, appoint administrative roles, and customize permissions',
  },
  {
    key: 'settings',
    label: 'Platform Settings',
    group: 'System & Governance',
    description: 'Maintenance mode toggles, college email whitelists, and operational constraints',
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: ALL_PERMISSION_KEYS,
  MODERATOR: ['dashboard', 'listings', 'deals', 'categories', 'banners', 'reports'],
  ID_VERIFIER: ['dashboard', 'students'],
};

/**
 * Check whether an admin user has permission for a specific module
 * @param {object} adminUser - The current admin user object
 * @param {string} permissionKey - e.g. 'categories', 'settings', etc.
 * @returns {boolean}
 */
export function hasModulePermission(adminUser, permissionKey) {
  if (!adminUser) return false;

  // Super Admin has unrestricted authority over all modules
  if (
    adminUser.is_superuser ||
    adminUser.effective_role === 'SUPER_ADMIN' ||
    adminUser.admin_role === 'SUPER_ADMIN'
  ) {
    return true;
  }

  // Check effective_permissions list if provided by backend
  if (Array.isArray(adminUser.effective_permissions) && adminUser.effective_permissions.length > 0) {
    return adminUser.effective_permissions.includes(permissionKey);
  }

  // Check custom admin_permissions list
  if (Array.isArray(adminUser.admin_permissions) && adminUser.admin_permissions.length > 0) {
    return adminUser.admin_permissions.includes(permissionKey);
  }

  // Fall back to default permissions for their assigned role
  const role = adminUser.admin_role || adminUser.effective_role || 'MODERATOR';
  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[role] || ['dashboard'];
  return roleDefaults.includes(permissionKey);
}

/**
 * Retrieve the array of all effective permission keys for an admin user
 * @param {object} adminUser
 * @returns {string[]}
 */
export function getEffectivePermissions(adminUser) {
  if (!adminUser) return [];

  if (
    adminUser.is_superuser ||
    adminUser.effective_role === 'SUPER_ADMIN' ||
    adminUser.admin_role === 'SUPER_ADMIN'
  ) {
    return ALL_PERMISSION_KEYS;
  }

  if (Array.isArray(adminUser.effective_permissions) && adminUser.effective_permissions.length > 0) {
    return adminUser.effective_permissions;
  }

  if (Array.isArray(adminUser.admin_permissions) && adminUser.admin_permissions.length > 0) {
    return adminUser.admin_permissions;
  }

  const role = adminUser.admin_role || adminUser.effective_role || 'MODERATOR';
  return DEFAULT_ROLE_PERMISSIONS[role] || ['dashboard'];
}
