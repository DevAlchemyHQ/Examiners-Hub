# Authentication Flow Diagram

## 🔐 Complete Sign-In & Sign-Out Flow

```mermaid
graph TD
    %% Start Points
    A[User visits app] --> B{Is user authenticated?}
    B -->|No| C[Show Login Screen]
    B -->|Yes| D[Redirect to /app]

    %% Login Screen Options
    C --> E[Login Screen - Sign In Mode]
    C --> F[Login Screen - Sign Up Mode]
    C --> G[Login Screen - Forgot Password Mode]

    %% Sign In Flow
    E --> H[User enters email & password]
    H --> I[AuthService.signInWithEmail]
    I --> J{Sign In Result}

    J -->|Success| K[Load user profile]
    J -->|UserNotFoundException| L[Show: 'No account found. Please sign up first.']
    J -->|NotAuthorizedException| M[Show: 'Invalid email or password']
    J -->|UserNotConfirmedException| N[Show: 'Please verify your email before signing in']
    J -->|LimitExceededException| O[Show: 'Too many login attempts. Please wait']
    J -->|InvalidParameterException| P[Show: 'Invalid email format']

    K --> Q[Store user in localStorage]
    Q --> R[Set auth state to true]
    R --> S[Navigate to /app]

    %% Sign Up Flow
    F --> T[User enters email, password, name]
    T --> U[User accepts terms]
    U --> V[AuthService.signUpWithEmail]
    V --> W{Sign Up Result}

    W -->|Success| X[Send verification email]
    W -->|UsernameExistsException| Y[Handle existing user]
    W -->|InvalidPasswordException| Z[Show: 'Password requirements not met']
    W -->|InvalidParameterException| AA[Show: 'Invalid email format']

    X --> BB[Switch to email verification mode]
    BB --> CC[Show: 'Please check your email and enter 6-digit OTP']

    %% Handle Existing User
    Y --> DD[Check user status]
    DD --> EE{User Status}

    EE -->|Verified| FF[Show: 'Account exists and verified. Please sign in']
    EE -->|Unverified with valid code| GG[Switch to email verification mode]
    EE -->|Unverified with expired code| HH[Delete old account & retry signup]

    GG --> II[Show: 'Please check your email for verification code']

    %% Email Verification Flow
    CC --> JJ[User enters 6-digit OTP]
    II --> JJ
    JJ --> KK[VerificationService.verifyCode]
    KK --> LL{Verification Result}

    LL -->|Success| MM[Check if user already confirmed in Cognito]
    LL -->|Invalid/Expired| NN[Show: 'Invalid or expired OTP code']
    LL -->|Too many attempts| OO[Show: 'Too many attempts. Please wait']

    MM --> PP{User Status in Cognito}
    PP -->|Already Confirmed| QQ[Proceed with success]
    PP -->|Not Confirmed| RR[AuthService.confirmUserInCognito]

    RR --> SS{Confirmation Result}
    SS -->|Success| QQ
    SS -->|NotAuthorizedException| TT[User already confirmed - proceed anyway]

    QQ --> UU[Update user metadata: email_verified = true]
    UU --> VV[Show: 'Email verified successfully!']
    VV --> WW[Redirect to login page with email pre-filled]

    %% Forgot Password Flow
    G --> XX[User enters email]
    XX --> YY[AuthService.resetPassword]
    YY --> ZZ{Reset Password Result}

    ZZ -->|Success| AAA[Switch to OTP verification mode]
    ZZ -->|UserNotFoundException| BBB[Show: 'No account found. Please sign up']
    ZZ -->|LimitExceededException| CCC[Show: 'Too many attempts. Please wait']
    ZZ -->|InvalidParameterException| DDD[Show: 'Invalid email format']

    AAA --> EEE[User enters OTP code]
    EEE --> FFF[AuthService.verifyResetOTP]
    FFF --> GGG{OTP Verification Result}

    GGG -->|Success| HHH[Switch to set new password mode]
    GGG -->|Invalid/Expired| III[Show: 'Invalid or expired OTP code']

    HHH --> JJJ[User enters new password]
    JJJ --> KKK[AuthService.confirmForgotPassword]
    KKK --> LLL{Password Reset Result}

    LLL -->|Success| MMM[Show: 'Password reset successfully']
    LLL -->|Invalid Password| NNN[Show: 'Password requirements not met']

    MMM --> OOO[Redirect to login page]

    %% Sign Out Flow
    S --> PPP[User clicks sign out]
    PPP --> QQQ[AuthService.signOut]
    QQQ --> RRR[Clear localStorage]
    RRR --> SSS[Set auth state to false]
    SSS --> TTT[Redirect to login page]

    %% Alternative Sign Out Paths
    UUU[User session expires] --> VVV[Auto sign out]
    VVV --> RRR

    WWW[User closes browser] --> XXX[Session persists in localStorage]
    XXX --> YYY[Next visit: check stored session]
    YYY --> ZZZ{Session Valid?}
    ZZZ -->|Yes| D
    ZZZ -->|No| C

    %% Error Recovery Paths
    L --> F
    M --> E
    N --> BB
    O --> E
    P --> E

    Z --> F
    AA --> F

    NN --> JJ
    OO --> JJ

    III --> EEE
    NNN --> JJJ

    %% Success Paths
    TT --> QQ

    %% Styling
    classDef success fill:#d4edda,stroke:#155724,stroke-width:2px,color:#155724
    classDef error fill:#f8d7da,stroke:#721c24,stroke-width:2px,color:#721c24
    classDef warning fill:#fff3cd,stroke:#856404,stroke-width:2px,color:#856404
    classDef info fill:#d1ecf1,stroke:#0c5460,stroke-width:2px,color:#0c5460

    class S,QQ,UU,VV,WW,MMM,OOO,TTT success
    class L,M,N,O,P,Z,AA,NN,OO,BBB,CCC,DDD,III,NNN error
    class GG,II,BB,CC warning
    class K,Q,R,DD,EE,FF,HH,MM,PP,QQ,RR,SS,TT info
```

## 📋 Detailed Flow Descriptions

### **1. Initial Access Flow**

- **Entry Point**: User visits the application
- **Authentication Check**: App checks localStorage for existing session
- **Decision**: If authenticated → redirect to `/app`, else → show login screen

### **2. Sign In Flow**

**Primary Path:**

1. User enters email & password
2. `AuthService.signInWithEmail()` called
3. **Success**: Load profile → Store session → Navigate to `/app`
4. **Failure**: Show specific error message based on exception type

**Error Alternatives:**

- `UserNotFoundException`: "No account found. Please sign up first."
- `NotAuthorizedException`: "Invalid email or password"
- `UserNotConfirmedException`: "Please verify your email before signing in"
- `LimitExceededException`: "Too many login attempts. Please wait"
- `InvalidParameterException`: "Invalid email format"

### **3. Sign Up Flow**

**Primary Path:**

1. User enters email, password, name
2. User accepts terms and conditions
3. `AuthService.signUpWithEmail()` called
4. **Success**: Send verification email → Switch to verification mode
5. **Failure**: Handle specific exceptions

**UsernameExistsException Handling:**

1. Check user verification status in Cognito
2. **If Verified**: "Account exists and verified. Please sign in"
3. **If Unverified with valid code**: Switch to verification mode
4. **If Unverified with expired code**: Delete old account → Retry signup

### **4. Email Verification Flow**

**Primary Path:**

1. User enters 6-digit OTP code
2. `VerificationService.verifyCode()` called
3. **Success**: Check if user already confirmed in Cognito
4. **If not confirmed**: `AuthService.confirmUserInCognito()`
5. Update user metadata → Show success → Redirect to login

**Error Alternatives:**

- Invalid/Expired OTP: "Invalid or expired OTP code"
- Too many attempts: "Too many attempts. Please wait"
- Already confirmed: Proceed with success (no error)

### **5. Forgot Password Flow**

**Primary Path:**

1. User enters email address
2. `AuthService.resetPassword()` called
3. **Success**: Send reset OTP → Switch to OTP verification
4. User enters OTP code
5. `AuthService.verifyResetOTP()` called
6. **Success**: Switch to set new password mode
7. User enters new password
8. `AuthService.confirmForgotPassword()` called
9. **Success**: Show success message → Redirect to login

**Error Alternatives:**

- User not found: "No account found. Please sign up"
- Too many attempts: "Too many attempts. Please wait"
- Invalid email: "Invalid email format"
- Invalid OTP: "Invalid or expired OTP code"
- Invalid password: "Password requirements not met"

### **6. Sign Out Flow**

**Primary Path:**

1. User clicks sign out button
2. `AuthService.signOut()` called
3. Clear localStorage (user, session)
4. Set auth state to false
5. Redirect to login page

**Alternative Paths:**

- **Session Expiry**: Auto sign out when session expires
- **Browser Close**: Session persists in localStorage for next visit
- **Session Check**: On next visit, validate stored session

## 🔄 Recovery & Error Handling

### **Session Recovery**

- Stored session checked on app initialization
- Valid session → Auto-login
- Invalid session → Clear storage → Show login

### **Error Recovery**

- All error states provide clear user guidance
- Error messages include actionable next steps
- Users can easily switch between sign-in/sign-up modes

### **Security Measures**

- Password requirements enforced
- Rate limiting on login attempts
- Session timeout handling
- Secure token storage in localStorage

## 🎯 Key Success Criteria

✅ **User Experience:**

- Clear error messages with actionable guidance
- Smooth transitions between authentication modes
- Consistent UI across all authentication screens
- No "scary" error messages

✅ **Security:**

- Proper validation of all inputs
- Secure handling of authentication tokens
- Protection against common attack vectors
- Rate limiting on sensitive operations

✅ **Reliability:**

- Graceful handling of network errors
- Fallback mechanisms for failed operations
- Consistent state management
- Proper cleanup on sign out
