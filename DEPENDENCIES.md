# Dependency Update Guide (September 2025)

## Overview

This guide documents the major dependency updates performed in September 2025 and provides guidance for adapting your code to the new versions.

## Major Updates

| Package | Old Version | New Version | Breaking Changes |
|---------|------------|-------------|------------------|
| Express | ^4.21.1 | ^5.1.0 | Yes - Middleware changes, Promise handling |
| Prisma | ^5.22.0 | ^6.16.2 | Yes - Client API changes |
| Zod | ^4.x | ^3.25.76 | Downgraded for compatibility |
| bcrypt | ^5.1.1 | ^6.0.0 | Minor API changes |
| dotenv | ^16.x | ^17.2.2 | Config options changes |
| uuid | ^11.x | ^13.0.0 | None significant |

## Express 5.x Migration Notes

Express 5 includes several breaking changes from Express 4:

1. **Middleware Changes**
   - Middleware execution order is more strict
   - Error handlers must have exactly 4 parameters
   - `res.send()` behavior changed for certain data types

2. **Promise Support**
   - Express 5 has native Promise support
   - Route handlers can now return Promises
   - Example:
     ```js
     app.get('/async', async (req, res) => {
       const data = await fetchData();
       return data; // Express 5 will automatically send the response
     });
     ```

3. **Security Headers**
   - `X-Powered-By` header is no longer sent by default
   - Use `app.disable('x-powered-by')` to ensure it's disabled

## Prisma 6.x Migration Notes

Prisma 6 includes several improvements:

1. **Performance Optimizations**
   - Faster query execution
   - Reduced memory usage

2. **New Features**
   - Enhanced JSON filtering
   - Improved relation handling
   - Full-text search improvements

## Dependency Stability Testing

A dependency stability test script is now available:

```bash
npm run test:deps
```

This script tests the basic functionality of major dependencies to ensure they're working correctly after updates.

## Common Issues and Solutions

### Express 5 Router Changes

If you're seeing routing issues:

```js
// Old way (Express 4)
app.use(function(err, req, res, next) {
  // Error handling
});

// New way (Express 5)
app.use(function(err, req, res, next) {
  // Error handling - ensure all 4 parameters are present
});
```

### Zod Version Downgrade

We've downgraded Zod from v4.x to v3.25.76 for compatibility with LangChain packages. If you were using v4-specific features, you'll need to adjust your code.

## Maintenance Scripts

We've added several helpful maintenance scripts to package.json:

- `npm run deps:check` - Check for outdated dependencies
- `npm run deps:update` - Update dependencies to latest compatible versions
- `npm run deps:upgrade` - Aggressively upgrade all dependencies (may break things)
