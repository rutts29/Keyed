# Privacy Feature Test Cases

## Test: Private Tip Flow

### Preconditions
- User authenticated with test wallet
- User has shielded balance >= 0.1 SOL (mocked)
- Creator profile exists in feed

### Steps
1. Navigate to `http://localhost:3000/app`
2. Wait for feed to load
3. Find a post with a "Tip" button
4. Click the "Tip" button
5. Wait for Tip Modal to open
6. Enter amount: 0.05 in the amount input
7. Find the "Tip privately" toggle switch
8. Click the toggle to enable private tipping
9. Verify shielded balance is displayed
10. Click "Send tip" button
11. Wait for transaction to process

### Expected Results
- Tip modal opens with title "Send a tip"
- Amount input accepts 0.05
- Toggle switch for private tip is visible
- When private tip enabled, shows "Shielded balance: X.XX SOL"
- Transaction processes (mock mode - instant)
- Success toast: "Tip sent" or similar
- Modal closes after successful tip

---

## Test: Shield SOL Flow

### Preconditions
- User authenticated with test wallet
- Shield modal accessible (via Privacy Balance or settings)

### Steps
1. Navigate to `http://localhost:3000/app`
2. Find and click button/link to open Shield modal
   - Look for "Shield" button or privacy balance component
3. Wait for Shield Modal to open
4. Verify modal title contains "Shield"
5. Enter amount: 0.5 in the amount input
6. Verify info text about shielded SOL
7. Click "Shield" button
8. Wait for transaction to process

### Expected Results
- Shield modal opens
- Title: "Shield SOL"
- Info text explains shielded SOL usage
- Amount input accepts 0.5
- Shows available balance
- Progress indicator may appear during shielding
- Success toast on completion
- Modal closes after success

---

## Test: Insufficient Shielded Balance Warning

### Preconditions
- User authenticated
- User has low/zero shielded balance

### Steps
1. Navigate to `http://localhost:3000/app`
2. Find and click "Tip" button on a post
3. Wait for Tip Modal to open
4. Enable private tip toggle
5. Enter amount higher than available shielded balance
6. Look for warning or "Shield more SOL" link

### Expected Results
- Private tip toggle is functional
- Shows current shielded balance
- If balance insufficient:
  - Shows warning or disabled send button
  - "Shield more SOL" link appears
  - Clicking link opens Shield modal

---

## Test: Shield More SOL Link

### Preconditions
- Tip modal open with private tip enabled
- Insufficient shielded balance

### Steps
1. From Tip Modal with private tip enabled
2. Find "Shield more SOL" button/link
3. Click the link
4. Verify Shield Modal opens

### Expected Results
- "Shield more SOL" link visible when balance low
- Clicking opens Shield Modal
- Tip modal may close or stay open
- User can add more shielded funds

---

## Test: Privacy Settings Default Toggle

### Preconditions
- User authenticated

### Steps
1. Navigate to `http://localhost:3000/settings`
2. Find privacy settings section
3. Look for "Default private tips" toggle
4. Note current state
5. Click toggle to change state
6. Navigate away and back to verify persistence

### Expected Results
- Privacy settings section visible
- Toggle for default private tips exists
- Toggle state changes on click
- Setting persists after navigation

---

## Test: Privacy Balance Display

### Preconditions
- User authenticated

### Steps
1. Navigate to `http://localhost:3000/dashboard`
2. Look for privacy/shielded balance section
3. Verify balance amounts displayed

### Expected Results
- Dashboard shows shielded balance
- May show:
  - Shielded amount
  - Available amount
  - Pending amount
- Values are numeric with SOL denomination

---

## Test: Private Tips Received History

### Preconditions
- User authenticated as creator
- Has received private tips (mocked)

### Steps
1. Navigate to `http://localhost:3000/dashboard`
2. Find private tips or earnings section
3. Look for tip history

### Expected Results
- Private tips section visible
- Shows tips received anonymously
- Does not reveal sender identity
- Shows amount and timestamp
