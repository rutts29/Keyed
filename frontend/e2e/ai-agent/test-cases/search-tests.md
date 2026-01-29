# Search Test Cases

## Test: Search Bar Visibility

### Preconditions
- Feed page loaded

### Steps
1. Navigate to `http://localhost:3000/app`
2. Look for search input field
3. Verify placeholder text

### Expected Results
- Search input visible on page
- Placeholder text contains "Search" or similar
- Input is focusable

---

## Test: Basic Search Submission

### Preconditions
- On feed page with search bar

### Steps
1. Navigate to feed page
2. Click on search input to focus
3. Type: "digital art"
4. Press Enter key
5. Observe navigation

### Expected Results
- Text input accepted
- Enter triggers search
- Navigates to `/search?q=digital%20art`
- Search results page loads

---

## Test: Search Suggestions Dropdown

### Preconditions
- On feed page
- Has recent searches in localStorage

### Steps
1. Navigate to feed page
2. Click on search input to focus
3. Observe dropdown appearance
4. Note suggestions shown

### Expected Results
- Dropdown appears on focus
- Shows "Recent searches" label if recent searches exist
- Suggestions are clickable
- Clicking suggestion performs search

---

## Test: Recent Searches Persistence

### Preconditions
- Fresh session

### Steps
1. Navigate to feed page
2. Search for "art"
3. Return to feed page
4. Focus search input
5. Check for "art" in suggestions

### Expected Results
- "art" saved as recent search
- Appears in suggestions dropdown
- Stored in localStorage under recent searches key

---

## Test: Search Results Display

### Preconditions
- Search page with query

### Steps
1. Navigate to `http://localhost:3000/search?q=creator`
2. Wait for results to load
3. Examine result cards

### Expected Results
- Results page loads
- Shows matching posts as cards
- Cards similar to feed posts
- Or shows "No results" message

---

## Test: Search from Results Page

### Preconditions
- On search results page

### Steps
1. Navigate to search page with initial query
2. Clear search input
3. Type new query: "music"
4. Press Enter
5. Verify URL updates

### Expected Results
- Can search again from results page
- URL updates with new query
- New results display
- Previous results replaced

---

## Test: Semantic Search Query

### Preconditions
- Search functionality working

### Steps
1. Navigate to feed page
2. Search for: "cozy coffee shop aesthetic"
3. Wait for results

### Expected Results
- Natural language query accepted
- No errors from complex query
- Returns relevant results (in real mode)
- In mock mode, may return empty or mock results

---

## Test: Empty Search Handling

### Preconditions
- On feed page

### Steps
1. Navigate to feed page
2. Focus search input
3. Press Enter without typing
4. Observe behavior

### Expected Results
- Does not navigate to search page
- Or navigates but handles gracefully
- No errors thrown

---

## Test: Tag Search from Feed

### Preconditions
- Feed with tagged posts

### Steps
1. Navigate to feed
2. Find a post with tags (e.g., #art)
3. Click on the tag
4. Observe search page

### Expected Results
- Tag click navigates to search
- Query contains tag text
- Results filtered by tag

---

## Test: Search Special Characters

### Preconditions
- Search bar accessible

### Steps
1. Navigate to feed page
2. Search for: "art 🎨"
3. Wait for results

### Expected Results
- Emoji accepted in search
- URL properly encodes special chars
- No JavaScript errors
- Results page loads
