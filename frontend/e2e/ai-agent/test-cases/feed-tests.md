# Feed Test Cases

## Test: Feed Page Load

### Preconditions
- User authenticated
- Development server running

### Steps
1. Navigate to `http://localhost:3000/app`
2. Wait for page to fully load
3. Look for post cards in the feed

### Expected Results
- Page loads without errors
- Feed section visible
- Either posts display or empty state shown
- No JavaScript errors in console

---

## Test: Post Card Display

### Preconditions
- Feed page loaded
- At least one post in feed

### Steps
1. Navigate to `http://localhost:3000/app`
2. Wait for feed to load
3. Find the first post card
4. Examine post card contents

### Expected Results
Post card should contain:
- Author avatar (or initials fallback)
- Author name and handle (@ prefix)
- Timestamp or date
- Post content/caption
- Like button with count
- Comment button with count
- Tip button
- Optional: Tags, images, token gate badge

---

## Test: Like Button Interaction

### Preconditions
- Feed loaded with posts
- User authenticated

### Steps
1. Navigate to feed at `http://localhost:3000/app`
2. Find a post's like button (shows like count)
3. Note the current like count
4. Click the like button
5. Observe the count change

### Expected Results
- Like button is clickable
- Count increments on click (optimistic update)
- Button may change appearance (filled heart)
- Action registers without page reload

---

## Test: Comment Navigation

### Preconditions
- Feed loaded with posts

### Steps
1. Navigate to feed
2. Find a post's comment button/link
3. Click the comment button
4. Observe navigation

### Expected Results
- Comment button is clickable
- Navigates to post detail page (`/post/{id}`)
- Post detail shows full content
- Comment section visible on detail page

---

## Test: Tip Button Opens Modal

### Preconditions
- Feed loaded with posts
- User authenticated

### Steps
1. Navigate to feed
2. Find a post's "Tip" button
3. Click the Tip button
4. Wait for modal to appear

### Expected Results
- Tip button visible on posts
- Clicking opens Tip Modal
- Modal shows recipient info
- Amount input and submit button present

---

## Test: Post Tags Display and Click

### Preconditions
- Feed loaded
- Posts with auto-generated tags

### Steps
1. Navigate to feed
2. Find a post with tag badges (# prefix)
3. Note the tags displayed
4. Click on a tag

### Expected Results
- Tags display as badges with # prefix
- Tags are clickable links
- Clicking navigates to search page
- Search query contains the tag text

---

## Test: Infinite Scroll

### Preconditions
- Feed with multiple posts
- More posts available than initial load

### Steps
1. Navigate to feed
2. Note number of visible posts
3. Scroll to bottom of feed
4. Wait for new content to load
5. Count posts again

### Expected Results
- Scrolling triggers load more
- New posts appear below existing
- No duplicate posts
- Loading indicator may appear briefly

---

## Test: Token Gated Post Badge

### Preconditions
- Feed contains token-gated posts

### Steps
1. Navigate to feed
2. Look for posts with lock icon or "Token Gated" badge
3. Identify token-gated vs regular posts

### Expected Results
- Token-gated posts visually distinguished
- May show lock icon or special badge
- Indicates content requires token access

---

## Test: Post Image Display

### Preconditions
- Feed contains posts with images

### Steps
1. Navigate to feed
2. Find a post with an image
3. Verify image displays

### Expected Results
- Image visible within post card
- Image properly sized/cropped
- Image loads without errors

---

## Test: Author Profile Link

### Preconditions
- Feed loaded with posts

### Steps
1. Navigate to feed
2. Find author name/avatar on a post
3. Click on author name or avatar
4. Observe navigation

### Expected Results
- Author name/avatar clickable
- Navigates to profile page (`/profile/{wallet}`)
- Profile page shows author details
