# 🔧 Development Tools

This directory contains development-only components and utilities that should **NEVER** be accessible in production.

## Security Safeguards

All components in this directory are protected by:

1. **Route Guards**: Routes are conditionally registered in `App.tsx` with `process.env.NODE_ENV === 'development'` checks
2. **Component Guards**: Components have internal production safety checks that block rendering in production
3. **Isolated from Production Build**: Development tools are tree-shaken in production builds

## Components

### QuickLoginDev.tsx

**Purpose**: Provides quick login functionality for testing different user roles during development.

**Security Notes**:
- Contains hardcoded test account credentials (for development only)
- Route is only registered when `NODE_ENV === 'development'`
- Has internal double-guard to prevent rendering in production
- Accessible at `/dev/quick-login` in development mode

**Test Accounts** (Development Only):
- Secretaria: `secretaria@comunika.com`
- Professor: `julianegrini@gmail.com`
- Aluno: `alinemenezes@gmail.com`
- Administrador: `admin.klase@comunika.com`

⚠️ **IMPORTANT**: These credentials are for development/testing only. Production accounts use the normal login flow.

## Best Practices

When adding new development tools:

1. Always add `process.env.NODE_ENV === 'development'` guards
2. Place components in this `/dev/` directory
3. Use route-level guards in `App.tsx`
4. Add component-level safety checks
5. Document security implications in this README
6. Never expose real production credentials

## Related Security Fixes

- **2025-11-24**: Removed hardcoded credentials from `Login.tsx` (CRITICAL security fix)
- **2025-11-24**: Created isolated `QuickLoginDev` component for development testing
- **2025-11-24**: Forced password reset for previously exposed accounts via migration
