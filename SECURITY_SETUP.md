# Security Setup Guide

## 🔒 Security Fixes Implemented

### 1. JWT Secret Security
- **Fixed**: Replaced weak JWT secret generation with proper cryptographic randomness
- **Before**: `JWT_SECRET = env.ADMIN_PASSWORD + "_jwt_secret"`
- **After**: Uses dedicated `JWT_SECRET` environment variable

### 2. Environment Variable Validation
- **Fixed**: Added proper validation for security-critical environment variables
- **Added**: `JWT_SECRET` (minimum 32 characters)
- **Enhanced**: `ADMIN_PASSWORD` (minimum 8 characters)

### 3. Server-Side Authentication Validation
- **Fixed**: Client-side admin state now validates with server
- **Before**: Trusted localStorage values without verification
- **After**: Token validation happens on server-side

### 4. Security Headers Middleware
- **Added**: Comprehensive security headers via Next.js middleware
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.

### 5. Build Configuration Security
- **Fixed**: Re-enabled TypeScript and ESLint checking
- **Before**: Ignored all build errors
- **After**: Only ignores errors in development when explicitly set

## 🔧 Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/jeux_girons"
DATABASE_URL_UNPOOLED="postgresql://username:password@localhost:5432/jeux_girons"

# Admin Configuration (minimum 8 characters)
ADMIN_PASSWORD="your-secure-admin-password-here"

# JWT Configuration (minimum 32 characters - generate with: openssl rand -base64 32)
JWT_SECRET="your-32-character-or-longer-jwt-secret-here"

# Development/Build Configuration
NODE_ENV="development"
SKIP_ENV_VALIDATION="false"
IGNORE_BUILD_ERRORS="false"
```

## 🔐 Generating Secure Secrets

### JWT Secret Generation
```bash
# Generate a secure 32-character JWT secret
openssl rand -base64 32

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Admin Password
- Use a strong password with at least 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Consider using a password manager

## 🛡️ Security Headers Added

The middleware now adds these security headers:

- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables XSS filtering
- **Referrer-Policy**: Controls referrer information
- **Content-Security-Policy**: Prevents XSS and data injection
- **Strict-Transport-Security**: Enforces HTTPS (production)
- **Permissions-Policy**: Restricts dangerous browser features

## 🔄 Authentication Flow Security

### Before (Insecure)
1. Client sets admin state in localStorage
2. Application trusts localStorage values
3. No server-side validation

### After (Secure)
1. Client attempts authentication with server
2. Server validates credentials and returns JWT
3. Client stores JWT in localStorage
4. On page load, client validates JWT with server
5. Server verifies JWT signature and expiration
6. Admin state updated based on server response

## 🚨 Security Recommendations

1. **Rotate JWT Secret**: Change the JWT secret regularly
2. **Strong Admin Password**: Use a password manager
3. **HTTPS Only**: Always use HTTPS in production
4. **Regular Updates**: Keep dependencies updated
5. **Security Monitoring**: Monitor for failed authentication attempts
6. **Backup Security**: Secure database backups

## 📋 Security Checklist

- [ ] JWT_SECRET is at least 32 characters
- [ ] ADMIN_PASSWORD is at least 8 characters
- [ ] Environment variables are properly set
- [ ] HTTPS is configured for production
- [ ] Security headers are working (test with browser dev tools)
- [ ] Authentication flow is tested

## 🔍 Testing Security

### Test Authentication
1. Try accessing admin features without login
2. Test with invalid JWT tokens
3. Test token expiration
4. Test logout functionality

### Test Security Headers
1. Open browser developer tools
2. Check Network tab for security headers
3. Verify CSP is not blocking legitimate resources
4. Test with security header analyzers

## 🆘 Troubleshooting

### Common Issues
1. **JWT_SECRET too short**: Increase to 32+ characters
2. **ADMIN_PASSWORD too short**: Increase to 8+ characters
3. **CSP blocking resources**: Update CSP policy in middleware
4. **Authentication not working**: Check JWT_SECRET matches between client/server

### Debug Mode
Set `IGNORE_BUILD_ERRORS="true"` in development if needed, but never in production. 