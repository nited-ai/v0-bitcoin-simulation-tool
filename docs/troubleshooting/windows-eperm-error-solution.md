# Windows EPERM Error Solution

## Problem
When running `npm run build` or `npm run dev` on Windows, you may encounter:
```
EPERM: operation not permitted, scandir 'C:\Users\[username]\Anwendungsdaten'
```

## Root Cause
Webpack tries to scan system directories like 'Anwendungsdaten' (Application Data) which are protected by Windows permissions.

## Solution

### For Local Development & Build
Use the `USERPROFILE` environment variable workaround:

```powershell
# For build
$env:USERPROFILE="C:\temp"; npm run build

# For development
$env:USERPROFILE="C:\temp"; npm run dev
```

### For npm Install Issues
If you encounter dependency resolution errors, use:

```powershell
# Clear cache first
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps
```

### Permanent Solution (Optional)
Add to your PowerShell profile (`$PROFILE`):
```powershell
# Add this to avoid EPERM errors in Node.js projects
$env:USERPROFILE="C:\temp"
```

## Why This Works
- Sets a temporary user profile directory that Webpack can access
- Avoids Windows system directory permission conflicts
- Doesn't affect actual user data or system configuration
- Works for both development and production builds

## Verification
After applying the solution:
1. `npm run build` should complete successfully
2. `npm run dev` should start without permission errors
3. All functionality remains intact

## Notes
- This is a Windows-specific issue
- Linux/macOS deployments (like Vercel) are unaffected
- The solution is safe and doesn't modify system settings
- Can be used for any Next.js project with similar issues
