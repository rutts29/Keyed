# Authentication Test Cases

## Test: Mock Wallet Session Initialization

### Preconditions
- Development server running at localhost:3000
- Fresh browser session (cleared localStorage)

### Steps
1. Navigate to `http://localhost:3000/app`
2. Wait for page to fully load
3. Open browser developer tools console
4. Execute: `window.__MOCK_WALLET__` to verify mock wallet exists
5. Execute: `localStorage.getItem('solshare-auth')` to verify session

### Expected Results
- `window.__MOCK_WALLET__` returns an object with `address` property
- `localStorage.getItem('solshare-auth')` returns a JSON string
- Parsed session contains `wallet`, `token`, and `user` fields
- No "Connect Wallet" button prominently displayed
- Feed content is accessible

---

## Test: Session Persistence Across Navigation

### Preconditions
- User authenticated on /app page

### Steps
1. Navigate to `http://localhost:3000/app`
2. Note the current wallet address from localStorage
3. Navigate to `http://localhost:3000/search`
4. Check localStorage session again
5. Navigate to `http://localhost:3000/settings`
6. Check localStorage session again

### Expected Results
- Wallet address remains the same across all pages
- Session token unchanged
- No re-authentication prompts
- All pages load without auth errors

---

## Test: Session Persistence Across Reload

### Preconditions
- User authenticated with mock wallet

### Steps
1. Navigate to `http://localhost:3000/app`
2. Store the current session from localStorage
3. Reload the page (Ctrl+R / Cmd+R)
4. Wait for page to load completely
5. Check localStorage session

### Expected Results
- Session data identical before and after reload
- User remains authenticated
- Feed loads without issues

---

## Test: Logout Clears Session

### Preconditions
- User authenticated

### Steps
1. Navigate to `http://localhost:3000/app`
2. Verify session exists in localStorage
3. Execute: `localStorage.removeItem('solshare-auth')`
4. Execute: `window.__MOCK_WALLET__.setConnected(false)`
5. Reload the page

### Expected Results
- Session removed from localStorage
- Page may show unauthenticated state
- May prompt to connect wallet

---

## Test: Protected Route Access

### Preconditions
- User authenticated

### Steps
1. Navigate to `http://localhost:3000/settings`
2. Check if page loads or redirects
3. Navigate to `http://localhost:3000/dashboard`
4. Check if page loads or redirects

### Expected Results
- Settings page accessible to authenticated users
- Dashboard page accessible to authenticated users
- No unauthorized errors
- No redirect to login page

---

## Test: User Profile in Session

### Preconditions
- User authenticated with mock wallet

### Steps
1. Navigate to `http://localhost:3000/app`
2. Execute: `JSON.parse(localStorage.getItem('solshare-auth')).user`
3. Verify user object structure

### Expected Results
- User object contains:
  - `wallet`: matches mock wallet address
  - `username`: "testuser"
  - `bio`: string value
  - `isVerified`: true
  - `followerCount`: number
  - `followingCount`: number
  - `postCount`: number
