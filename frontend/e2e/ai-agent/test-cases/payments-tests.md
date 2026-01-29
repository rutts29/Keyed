# Payment Test Cases

## Test: Tip Modal Opening

### Preconditions
- Feed loaded with posts
- User authenticated

### Steps
1. Navigate to `http://localhost:3000/app`
2. Find a post in the feed
3. Locate the "Tip" button on the post
4. Click the Tip button
5. Wait for modal to appear

### Expected Results
- Tip button visible on posts
- Click opens dialog/modal
- Modal title: "Send a tip"
- Modal contains amount input
- Shows recipient info

---

## Test: Tip Amount Input

### Preconditions
- Tip modal open

### Steps
1. Open Tip modal (click Tip on any post)
2. Find the amount input field
3. Clear any default value
4. Type: "0.25"
5. Verify value displayed

### Expected Results
- Amount input is editable
- Accepts decimal values
- Shows "0.25" after typing
- Input labeled as "Amount (SOL)"

---

## Test: Preset Amount Buttons

### Preconditions
- Tip modal open

### Steps
1. Open Tip modal
2. Find preset amount buttons (e.g., 0.1 SOL, 0.5 SOL, 1 SOL)
3. Click the "0.5 SOL" button
4. Check amount input value

### Expected Results
- Preset buttons visible (typically 3 options)
- Clicking preset updates amount input
- Amount input shows "0.5"
- Can click different presets to change

---

## Test: Private Tip Toggle in Modal

### Preconditions
- Tip modal open
- User has shielded balance

### Steps
1. Open Tip modal
2. Find "Tip privately" toggle switch
3. Check initial state
4. Click toggle to enable
5. Observe UI changes

### Expected Results
- Toggle switch visible
- Clicking toggles state
- When enabled:
  - Shows shielded balance
  - May show "Shield more SOL" if insufficient

---

## Test: Submit Tip (Mock Mode)

### Preconditions
- Tip modal open
- Valid amount entered
- User authenticated

### Steps
1. Open Tip modal
2. Enter amount: 0.1
3. Leave as public tip (private toggle off)
4. Click "Send tip" button
5. Wait for response

### Expected Results
- Send button clickable
- In mock mode, processes quickly
- Shows success toast "Tip sent"
- Modal closes on success

---

## Test: Tip Validation - Empty Amount

### Preconditions
- Tip modal open

### Steps
1. Open Tip modal
2. Clear amount input (empty)
3. Click "Send tip"
4. Observe validation

### Expected Results
- Validation prevents submission
- Error toast: "Enter a valid amount"
- Modal stays open

---

## Test: Tip Validation - Zero Amount

### Preconditions
- Tip modal open

### Steps
1. Open Tip modal
2. Enter amount: 0
3. Click "Send tip"
4. Observe validation

### Expected Results
- Zero amount rejected
- Error message shown
- Modal stays open

---

## Test: Cancel Tip Modal

### Preconditions
- Tip modal open

### Steps
1. Open Tip modal
2. Enter some amount
3. Click "Cancel" button
4. Observe modal

### Expected Results
- Cancel button visible
- Clicking closes modal
- No tip sent
- Can reopen modal later

---

## Test: Tip from Profile Page

### Preconditions
- On a creator's profile page

### Steps
1. Navigate to `http://localhost:3000/profile/CreatorWa11etAddressForE2ETesting11111111`
2. Find "Tip" button on profile
3. Click the button
4. Verify Tip modal opens

### Expected Results
- Tip button visible on creator profile
- Click opens Tip modal
- Modal shows creator as recipient
- Can complete tip flow

---

## Test: Private Tip Insufficient Balance

### Preconditions
- Tip modal open
- Low/zero shielded balance

### Steps
1. Open Tip modal
2. Enable private tip toggle
3. Enter amount larger than shielded balance
4. Observe UI

### Expected Results
- Shows current shielded balance
- "Shield more SOL" link appears
- Send button may be disabled
- Cannot send private tip without balance
