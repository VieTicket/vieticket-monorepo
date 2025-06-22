# Admin Route Protection

This document explains how admin routes are protected in the Vieticket application.

## Overview

All routes under `/admin/*` are protected and only accessible to users with the `admin` role. Non-admin users will receive a 404 error when trying to access these routes.

## Implementation Details

### 1. Middleware Protection (`middleware.ts`)

The middleware provides the first layer of protection:

- **Authentication Check**: If user is not logged in, redirects to `/auth/sign-in`
- **Role Check**: If user doesn't have `admin` role, returns 404 status
- **Route Matching**: Applies to all routes starting with `/admin`

### 2. Layout-Level Protection (`app/admin/layout.tsx`)

The admin layout provides server-side protection:

- Uses the `authorise("admin")` function to verify admin role
- If authorization fails, redirects to home page (creating 404 effect)
- Protects all admin sub-pages automatically

### 3. API Route Protection

All admin API routes use the `authorise("admin")` function:

- `/api/admin/users/*` - User management endpoints
- All admin API routes are protected at the function level

## User Roles

The application supports the following roles:

- `customer` - Regular users who can buy tickets
- `organizer` - Event organizers who can create events
- `admin` - Administrators with full system access
- `unassigned` - Default role for new users

## Testing

To test admin functionality:

1. Create an admin user in the database:
   ```sql
   INSERT INTO "user" (id, name, email, role, "emailVerified") 
   VALUES ('admin123456789abcdef', 'Admin User', 'admin@vieticket.com', 'admin', true);
   ```

2. Or use the seed script which includes an admin user:
   ```bash
   npm run db:seed
   ```

3. Sign in with admin credentials and navigate to `/admin`

## Security Notes

- Admin protection is implemented at multiple layers for defense in depth
- Middleware provides immediate rejection for non-admin users
- Layout-level protection ensures server-side verification
- API routes are individually protected
- All admin routes return 404 for unauthorized users (not 403) to hide admin functionality

## Files Modified

- `middleware.ts` - Updated logic for admin route protection
- `app/admin/layout.tsx` - Added server-side admin verification
- `packages/db/src/scripts/seed.ts` - Added admin user for testing 