# Troubleshooting Update Issues

If you're having trouble seeing the latest version of the app, try these solutions in order:

## Quick Fixes

### 1. Force Hard Refresh

- **Windows/Linux**: Press `Ctrl + Shift + R`
- **Mac**: Press `Cmd + Shift + R`

### 2. Clear Browser Cache

- **Chrome**: Settings → Privacy and security → Clear browsing data → All time
- **Firefox**: Settings → Privacy & Security → Clear Data → Everything
- **Safari**: Develop menu → Empty Caches

### 3. Try Incognito/Private Mode

Open the app in an incognito/private window to bypass cache completely.

### 4. Disable Browser Extensions

Some extensions can interfere with updates. Temporarily disable all extensions.

## Advanced Solutions

### 5. Clear Application Cache

- **Chrome**: Settings → Privacy and security → Site Settings → Storage → Clear data
- **Firefox**: Settings → Privacy & Security → Cookies and Site Data → Manage Data → Remove All

### 6. Reset Browser Settings

- **Chrome**: Settings → Advanced → Reset settings
- **Firefox**: Settings → General → Refresh Firefox

### 7. Try Different Browser

Test the app in a different browser to isolate the issue.

## Technical Solutions

### 8. Check Network Settings

- Disable VPN if using one
- Try different network connection
- Check if corporate firewall is blocking updates

### 9. Browser Developer Tools

1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### 10. Service Worker Issues

If the app uses a service worker:

1. Open Developer Tools
2. Go to Application tab
3. Find Service Workers
4. Click "Unregister" for the app
5. Refresh the page

## Still Having Issues?

If none of the above work:

1. **Contact Support**: Provide your browser version and operating system
2. **Try Mobile**: Test on mobile browser
3. **Check URL**: Ensure you're on the correct URL
4. **Wait**: Sometimes updates take time to propagate

## Browser-Specific Issues

### Chrome

- Go to `chrome://settings/clearBrowserData`
- Select "All time" and all checkboxes
- Click "Clear data"

### Firefox

- Go to `about:preferences#privacy`
- Click "Clear Data" under Cookies and Site Data

### Safari

- Enable Develop menu: Safari → Preferences → Advanced → Show Develop menu
- Develop → Empty Caches

### Edge

- Settings → Privacy, search, and services → Clear browsing data
- Choose "All time" and clear everything
