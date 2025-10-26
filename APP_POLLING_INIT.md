# App.tsx Polling Initialization

Add the following code to your `App.tsx` to initialize the polling functionality:

```typescript
import { useEffect } from "react";
import { useMetadataStore } from "./store/metadataStore";

function App() {
  const { startPolling } = useMetadataStore();

  useEffect(() => {
    // Start polling for form data sync
    console.log("🔄 Initializing form data polling...");
    startPolling();

    // Cleanup would go here if we add a stopPolling method
    // return () => {
    //   stopPolling?.();
    // };
  }, [startPolling]);

  // ... rest of your App component
}
```

## Usage Notes

1. **When to call**: Call `startPolling()` in your main App component or in the MainApp component where users interact with the form.

2. **Alternative**: You can also call it conditionally based on user authentication:

```typescript
useEffect(() => {
  if (isAuthenticated) {
    startPolling();
  }
}, [isAuthenticated, startPolling]);
```

3. **Performance**: The polling runs every 5 seconds to check for newer form data on AWS. This provides a good balance between responsiveness and AWS API costs.

4. **Private browsing**: The BroadcastChannel and localStorage sync mechanisms work in private browsing mode in Chrome, Firefox, and Safari.
