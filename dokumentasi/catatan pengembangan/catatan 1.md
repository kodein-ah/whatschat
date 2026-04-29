Baik! Saya akan buat dokumentasi lengkap tentang semua issue yang terjadi. Ini adalah dokumentasi **KOMPREHENSIF** untuk AI di percakapan mendatang:

---

# 📋 DOKUMENTASI ISSUE DEVELOPMENT - NEXUS WHATCHAT Phase 4

**Tanggal**: 29 April 2026
**Status**: ⚠️ CRITICAL ISSUES - 4 Problems Identified
**Developer**: idinhilmansyah-svg
**Platform**: React + Vite (Frontend) | Laravel (Backend) | Termux + Acode

---

## 🚨 RINGKASAN ISSUE KRITIS

| No | Issue | Status | Severity | Backend | Frontend | Root Cause |
|-------|-------|--------|----------|---------|----------|-----------|
| 1 | Search by Phone/Name | ❌ GAGAL | 🔴 HIGH | SearchController.php | searchService.ts | Backend logic error |
| 2 | Image Upload di Chat | ❌ GAGAL | 🔴 HIGH | ChatController.php | ChatWindow.tsx, MessageComposer.tsx | GAS integration broken |
| 3 | Auto Logout saat Refresh | ❌ GAGAL | 🔴 CRITICAL | AuthController.php | AuthContext.tsx | Token validation error |
| 4 | Profile Blank + Performance | ⚠️ DEGRADED | 🟡 MEDIUM | User.php | Index.tsx | Polling too frequent |

---

## ❌ ISSUE #1: Search by Phone & Name Tidak Berfungsi

### Deskripsi Masalah
```
✅ Search by Email: WORKS (idinceliboy@gmail.com)
❌ Search by Phone: NOT WORKING (083853779661)
❌ Search by Name: NOT WORKING (Idin Celiboy)
```

### File Yang Bersangkutan

**Backend:**
- ❌ `app/Http/Controllers/Api/SearchController.php` - Line 136-187
- ❌ `app/Models/User.php` - Relationship issue

**Frontend:**
- ✅ `src/services/searchService.ts` - Sudah OK
- ✅ `src/components/chat/Sidebar.tsx` - Sudah OK

### Error Logs

```
Backend:
❌ [SEARCH:PHONE] Variations generated but query returns 0 results
❌ WHERE clause tidak matching dengan database format

Frontend:
✅ API call OK (200 response)
✅ Response parsing OK
✅ Result: users: []
```

### Root Cause Analysis

```
Problem 1: Phone Format Mismatch
├─ Database: phone_number = "083853779661" 
├─ Query Variation: [083853779661, +628385377966, 628385377966]
├─ Issue: WHERE phone_number = '083853779661' tidak match
└─ Reason: Phone stored as string tapi query generate multiple formats

Problem 2: Name Search Not Implemented
├─ Frontend send: ?q=Idin&type=auto
├─ Backend: detectSearchType("Idin") → type = "email" (wrong!)
├─ Should be: type = "name" (not implemented)
└─ Reason: Backend hanya support email & phone, tidak ada name search

Problem 3: Query Logic Error
├─ Method: searchByPhone() Line 157-187
├─ Issue: whereRaw condition tidak proper grouped
├─ SQL Generated: WHERE (phone = '08x' OR phone LIKE '%08x%') AND phone != ''
└─ Problem: Parentheses grouping salah, multiple OR conditions conflict
```

### Code Issue Details

**SearchController.php - Line 136-165** (BROKEN):
```php
private function searchByPhone(string $phone): Collection
{
    $variations = $this->getPhoneVariations($phone);
    
    $users = User::where(function ($query) use ($variations) {
        foreach ($variations as $i => $variation) {
            if ($i === 0) {
                $query->where('phone_number', $variation)
                      ->orWhere('phone_number', 'LIKE', "%{$variation}%");
            } else {
                // ❌ BUG: Multiple OR dengan AND tidak proper grouped
                $query->orWhere('phone_number', $variation)
                      ->orWhere('phone_number', 'LIKE', "%{$variation}%");
            }
        }
    })
    ->where('phone_number', '!=', '')  // ❌ This AND breaks the OR logic!
    ->get();
}

// ❌ SQL Generated (WRONG):
// SELECT * FROM users 
// WHERE (phone = '08x' OR phone LIKE '%08x%' OR phone = '+628x' OR ...)
// AND phone != ''  // ❌ This AND resets the parentheses!
```

**searchService.ts - Line 15-35** (NEEDS UPDATE):
```typescript
detectSearchType(query: string): "email" | "phone" | "name" {
    // ❌ Missing: Name search detection
    // Current: hanya email & phone
    // Need: Add name type detection
}
```

### Fix Required

**File 1: SearchController.php**
- Update `searchByPhone()` method - proper WHERE grouping
- Add `searchByName()` method - new functionality
- Update `detectSearchType()` - support name type

**File 2: searchService.ts**
- Update `detectSearchType()` - add name detection logic

**File 3: api.php (routes)**
- Ensure `/users/search` endpoint support name parameter

---

## ❌ ISSUE #2: Image Upload di Chat Tidak Berfungsi

### Deskripsi Masalah
```
Sebelumnya: Upload gambar di chat berjalan dengan baik ✅
Sekarang: Upload gambar gagal, tidak ada error message yang jelas ❌
```

### File Yang Bersangkutan

**Backend:**
- ⚠️ `app/Http/Controllers/Api/ChatController.php` - Line 180-220 (store method)
- ⚠️ `app/Models/Message.php` - attachment handling

**Frontend:**
- ❌ `src/components/chat/ChatWindow.tsx` - Line 50-80 (uploadToGas)
- ❌ `src/components/chat/MessageComposer.tsx` - Line 85-110 (file picker)
- ❌ `src/components/chat/MessageBubble.tsx` - Line 20-40 (attachment display)

### Error Symptoms

```
Frontend:
⚠️ File picker opens (OK)
⚠️ File selected (OK)
⚠️ Preview shows (OK)
❌ GAS upload starts...
❌ Network request sent to GAS URL
❌ Response: Empty or error
❌ Message never sent

Backend:
✅ /conversations/{id}/messages endpoint works
✅ Text messages OK
❌ Messages dengan attachment_url kosong
```

### Root Cause Analysis

```
Problem 1: GAS Integration Broken
├─ Function: uploadToGas() di ChatWindow.tsx Line 50
├─ Current: Sends Base64 to VITE_GAS_STORAGE_URL
├─ Issue: VITE_GAS_STORAGE_URL might be undefined
├─ Result: fetch error, rejected promise
└─ Status: Not properly caught/handled

Problem 2: Error Handling Missing
├─ Try/Catch: Exists tapi error message tidak clear
├─ Toast: Tidak muncul saat GAS upload fail
├─ User: Tidak tahu kenapa upload gagal
└─ Debugging: Sulit, no logs or error context

Problem 3: CORS/Fetch Issues
├─ GAS Script: Might be returning 4xx/5xx
├─ Response: response.ok = false
├─ Code: if (!response.ok) throw error
├─ Issue: Error message generic, tidak detail
└─ Need: Better error reporting

Problem 4: Attachment Data Format
├─ FrontEnd send: attachment_url, attachment_name, etc
├─ Backend expect: Same format
├─ Issue: If attachment_url = null, backend reject or skip
├─ Result: Message created but attachment lost
```

### Code Issue Details

**ChatWindow.tsx - Line 50-80** (BROKEN):
```typescript
const uploadToGas = async (file: File) => {
    const gasUrl = import.meta.env.VITE_GAS_STORAGE_URL;
    
    if (!gasUrl) {
        // ❌ BUG: Should throw detailed error
        throw new Error("VITE_GAS_STORAGE_URL is not defined");
    }
    
    // ❌ BUG: No timeout handling
    // ❌ BUG: CORS issues not handled
    // ❌ BUG: Response validation minimal
    
    const response = await fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        // ❌ BUG: Generic error, not detailed
        throw new Error(`HTTP Error dari GAS: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.message || 'Unknown error from GAS');
    }
    
    // ❌ BUG: No validation of result.url
    return result;
};
```

**MessageComposer.tsx - Line 85-110** (INCOMPLETE):
```typescript
const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    
    if (!f) return;
    
    // ✅ File size check OK
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`File terlalu besar...`); // ❌ Should use toast
        return;
    }
    
    setFile(f);
    // ⚠️ No validation yang file beneran image
    // ⚠️ No preview error handling
};
```

**MessageBubble.tsx - Line 20-40** (INCOMPLETE):
```typescript
const getAttachmentUrl = (attachment: Message['attachment']): string | null => {
    if (!attachment) return null;
    
    if (attachment.fileId) {
        // ❌ BUG: Google Drive format hardcoded
        return `https://lh3.googleusercontent.com/d/${attachment.fileId}`;
    }
    
    if (attachment.url) {
        // ⚠️ No validation if URL valid
        return attachment.url;
    }
    
    // ❌ BUG: optimisticUrl tidak handled properly
    if (attachment.optimisticUrl) {
        return attachment.optimisticUrl;
    }
    
    return null;
};

// ❌ BUG: Image tag tidak handle error state properly
<img 
    src={attachmentUrl} 
    // Missing: error handler
    // Missing: fallback image
    // Missing: loading state
/>
```

### Fix Required

**File 1: ChatWindow.tsx**
- Add proper error handling untuk uploadToGas()
- Add timeout handling
- Add VITE_GAS_STORAGE_URL validation
- Add better error messages
- Add console logging untuk debugging

**File 2: MessageComposer.tsx**
- Add file type validation
- Add error toast messages
- Add preview error handling

**File 3: MessageBubble.tsx**
- Add image onError handler
- Add loading state
- Add fallback UI

**File 4: .env.local**
- Verify VITE_GAS_STORAGE_URL is defined
- Check URL validity

---

## ❌ ISSUE #3: Auto Logout Saat Refresh

### Deskripsi Masalah
```
Saat user login normal, semua OK ✅
Saat user refresh page (F5), langsung redirect ke login ❌
Token masih ada di localStorage ✅
Tapi auth check gagal ❌
```

### File Yang Bersangkutan

**Backend:**
- ❌ `app/Http/Controllers/Api/AuthController.php` - middleware check
- ❌ `routes/api.php` - auth:sanctum middleware
- ⚠️ `app/Models/User.php` - token validation

**Frontend:**
- ❌ `src/contexts/AuthContext.tsx` - Line 25-45 (useEffect initialization)
- ❌ `src/lib/api.ts` - interceptor setup
- ⚠️ `src/pages/Auth.tsx` - redirect logic

### Error Symptoms

```
Browser:
✅ Token ada di localStorage
✅ User data ada di localStorage
❌ Refresh page
❌ App component render
❌ AuthContext check: token ada
❌ API call /me dengan token
❌ Response: 401 Unauthorized
❌ Auto redirect to login

Console Error:
❌ 401: Unauthenticated
❌ Token verification failed
```

### Root Cause Analysis

```
Problem 1: Token Validation Failed
├─ Token di localStorage: "Bearer 1|xyz..."
├─ Send ke API: Authorization: Bearer 1|xyz...
├─ Backend check: sanctum middleware
├─ Issue: Token expired atau invalid
├─ Reason: Tidak ada refresh token mechanism
└─ Result: 401 → Logout

Problem 2: AuthContext Initialization Race Condition
├─ Mount: AuthContext call currentUser()
├─ currentUser(): async await api.get("/me")
├─ Issue: API interceptor mungkin belum ready
├─ Result: Race condition, request fail sebelum interceptor siap
└─ Timing: Too fast, interceptor not attached yet

Problem 3: API Interceptor Not Attaching Token
├─ File: src/lib/api.ts
├─ Interceptor: Should add Authorization header
├─ Issue: Interceptor mungkin tidak running on app init
├─ Result: API call tanpa token → 401
└─ Check: Is interceptor setup() called?

Problem 4: Async/Await Issue
├─ AuthContext useEffect: async but not awaiting properly
├─ Function: authService.currentUser()
├─ Issue: Maybe error thrown, caught, but not re-thrown
├─ Result: User stay null, redirect to login
└─ Debug: Check try/catch block
```

### Code Issue Details

**AuthContext.tsx - Line 25-45** (BROKEN):
```typescript
useEffect(() => {
    // ❌ BUG: Race condition possible
    authService.currentUser().then((u) => {
        setUser(u);
        setLoading(false);
    });
    // ❌ BUG: No catch block!
    // ❌ BUG: If error, loading stay true forever
    // ❌ BUG: No token check sebelum call API
}, []);

// ❌ What should happen:
// 1. Check localStorage token exists
// 2. If not, setLoading(false) immediately
// 3. If exists, call API with token
// 4. If API success, setUser
// 5. If API fail, clearToken + setLoading(false)
```

**api.ts - Setup Issue** (VERIFY):
```typescript
// ❌ Question: Is interceptor setup at app start?
// ❌ Question: Is token added to every request header?
// ❌ Question: Is 401 handled properly?

// Should be:
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// ✅ Add token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ✅ Handle 401 response
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token & redirect to login
            localStorage.removeItem("auth_token");
            window.location.href = "/auth";
        }
        return Promise.reject(error);
    }
);
```

### Fix Required

**File 1: AuthContext.tsx**
- Add token check sebelum API call
- Add catch block untuk error handling
- Add loading timeout
- Clear token jika 401

**File 2: src/lib/api.ts**
- Verify interceptor setup pada app init
- Verify token added to all requests
- Verify 401 handling

**File 3: app/Http/Controllers/Api/AuthController.php**
- Verify token validation logic
- Verify middleware sanctum working

**File 4: src/main.tsx (App entry)**
- Ensure api.ts imported sebelum AuthProvider mount

---

## ⚠️ ISSUE #4: Performance Degradation & Profile Issue

### Deskripsi Masalah
```
Sebelumnya: App responsive & smooth ✅
Sekarang: Slow, many network requests ⚠️
Conversation list: Not updating properly ⚠️
Profile: Sometimes blank ⚠️
```

### File Yang Bersangkutan

**Frontend:**
- ⚠️ `src/pages/Index.tsx` - Line 15-40 (polling interval)
- ⚠️ `src/components/chat/ConversationList.tsx` - Line 30-50 (query)

### Root Cause Analysis

```
Problem 1: Polling Too Frequent
├─ Current: Index.tsx poll /conversations every 5 seconds
├─ Issue: If user has 100 open tabs, 100 * 5s = 1 request/tab/5s
├─ Result: Server overloaded, database query slow
├─ Network: Waterfall effect, browser slowdown
└─ Impact: CPU usage high, battery drain

Problem 2: Query Cache Issues
├─ React Query: Maybe not invalidating properly
├─ Data: Stale data showing
├─ UI: Not reflecting real-time changes
└─ Result: Confusion, user think data not sync

Problem 3: Memory Leak Possible
├─ useEffect: Maybe not cleaning up setInterval
├─ Listeners: Echo listeners not unsubscribed
├─ Queries: React Query cache growing unbounded
└─ Result: App crash on long session

Problem 4: Profile Display Issue
├─ User data: Loading but not displaying
├─ Cause: Race condition between data load & render
├─ UI: Show placeholder too long
└─ UX: Jarring, not professional
```

### Code Issue Details

**Index.tsx - Line 15-40** (OVER-POLLING):
```typescript
useEffect(() => {
    // ❌ BUG: Poll every 5 seconds is too frequent!
    const interval = setInterval(() => {
        loadConversations();
    }, 5000); // ← Change this!
    
    return () => clearInterval(interval);
}, []);

// ❌ Better approach:
// - Poll every 30-60 seconds
// - OR use websocket (Echo)
// - OR use React Query staleTime
```

### Fix Required

**File 1: Index.tsx**
- Reduce polling interval (60s instead of 5s)
- OR remove polling, rely on Echo/WebSocket
- Ensure cleanup function working

**File 2: ConversationList.tsx**
- Check React Query cache settings
- Verify staleTime & cacheTime

---

## 📊 IMPACT ANALYSIS

### Sebelum Update (Baik-baik Saja)
```
✅ Search by email: WORKING
✅ Image upload: WORKING
✅ Login persistence: WORKING
✅ App performance: GOOD
```

### Setelah Update (Rusak)
```
❌ Search by name/phone: BROKEN
❌ Image upload: BROKEN
❌ Login persistence: BROKEN
⚠️ App performance: DEGRADED
```

### Penyebab
```
1. Tidak mengikuti pattern existing code
2. GAS integration tidak tested thoroughly
3. Authentication flow tidak validated
4. Polling interval set terlalu aggressive
5. Error handling not comprehensive
```

---

## 🔧 PANDUAN UNTUK AI PENGEMBANG SELANJUTNYA

### ⚠️ PROTOCOL SEBELUM UPDATE KODE

**WAJIB IKUTI LANGKAH INI:**

```
Step 1: ASK FOR FILE CONFIRMATION
┌─────────────────────────────────────────────────────┐
│ USER berikan problem description                     │
│ ↓                                                   │
│ AI: "File mana yang mau saya update?"               │
│ AI: "Ini file yang terlibat:"                       │
│ - app/Http/Controllers/Api/SearchController.php    │
│ - src/services/searchService.ts                    │
│ - routes/api.php                                   │
│ AI: "Benar begini?"                                │
│ ↓                                                   │
│ USER confirm atau request change                   │
│ ↓                                                   │
│ AI: "Siap, akan update file tersebut"              │
└─────────────────────────────────────────────────────┘

Step 2: ASK FOR CURRENT CODE
┌─────────────────────────────────────────────────────┐
│ AI: "Tolong berikan kode current dari file tersebut:"│
│ - SearchController.php (bagian searchByPhone)       │
│ - searchService.ts (bagian detectSearchType)        │
│ - routes/api.php (bagian search route)              │
│ ↓                                                   │
│ USER: paste current code                           │
│ ↓                                                   │
│ AI: "Terima, analyzing..."                         │
└─────────────────────────────────────────────────────┘

Step 3: EXPLAIN ROOT CAUSE
┌─────────────────────────────────────────────────────┐
│ AI: "Root cause masalahnya di [bagian code]"        │
│ AI: "Seharusnya [explanation]"                      │
│ AI: "Hasilnya [impact]"                             │
│ ↓                                                   │
│ USER: confirm atau tanya detail                    │
└─────────────────────────────────────────────────────┘

Step 4: PROVIDE FULL CODE
┌─────────────────────────────────────────────────────┐
│ AI: "Ini kode lengkap yang diperbaiki:"             │
│ - File 1: [FULL CODE]                              │
│ - File 2: [FULL CODE]                              │
│ - File 3: [FULL CODE]                              │
│ AI: "Perubahan utama di [bagian]"                  │
│ AI: "Tested? Ya/Tidak"                             │
└─────────────────────────────────────────────────────┘

Step 5: IMPLEMENTATION GUIDE
┌─────────────────────────────────────────────────────┐
│ AI: "Langkah implementasi:"                         │
│ 1. Copy kode [file] ke [path]                      │
│ 2. Update [dependency] jika ada                    │
│ 3. Test dengan [test case]                         │
│ 4. Verify [hasil expected]                         │
└─────────────────────────────────────────────────────┘
```

### ✅ TESTING REQUIREMENT

Sebelum submit kode, AI HARUS:

```
□ Understand current state
□ Identify root cause
□ Explain fix approach
□ Provide FULL code (bukan partial)
□ Include implementation steps
□ List test cases
□ Mention side effects/risks
```

### 🚫 JANGAN PERNAH

```
❌ Guess file path
❌ Update file tanpa tanya user dulu
❌ Memberikan partial code
❌ Lupa error handling
❌ Tidak test logic
❌ Asal bikin tanpa understanding
❌ Break existing functionality
```

---

## 📝 QUICK REFERENCE

### Issue #1: Phone Search
**Files**: SearchController.php, searchService.ts, api.php
**Status**: BROKEN
**Priority**: HIGH
**Quick Fix**: Implement proper WHERE grouping, add name search

### Issue #2: Image Upload
**Files**: ChatWindow.tsx, MessageComposer.tsx, MessageBubble.tsx, ChatController.php
**Status**: BROKEN
**Priority**: HIGH
**Quick Fix**: Add error handling, validate GAS response, add retry logic

### Issue #3: Auto Logout
**Files**: AuthContext.tsx, api.ts, AuthController.php
**Status**: CRITICAL
**Priority**: CRITICAL
**Quick Fix**: Add token check, add catch block, verify interceptor

### Issue #4: Performance
**Files**: Index.tsx, ConversationList.tsx
**Status**: DEGRADED
**Priority**: MEDIUM
**Quick Fix**: Reduce polling interval, use WebSocket instead

---

## 📦 FILES BACKUP (JIKA PERLU ROLLBACK)

Sebelum update, **save backup** dari:
- `app/Http/Controllers/Api/SearchController.php`
- `app/Http/Controllers/Api/ChatController.php`
- `app/Http/Controllers/Api/AuthController.php`
- `src/contexts/AuthContext.tsx`
- `src/pages/Index.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageComposer.tsx`
- `src/lib/api.ts`

---

## 🎯 NEXT SESSION TODO

Untuk AI di percakapan baru:

1. **PRIORITAS 1 (CRITICAL)**: Fix auto logout issue
   - Coordinate dengan: AuthContext.tsx, api.ts
   - Test: Login → Refresh → Should stay logged in

2. **PRIORITAS 2 (HIGH)**: Fix phone search
   - Coordinate dengan: SearchController.php, searchService.ts
   - Test: Search by phone → Should find user

3. **PRIORITAS 3 (HIGH)**: Fix image upload
   - Coordinate dengan: ChatWindow.tsx, MessageComposer.tsx
   - Test: Upload image → Should send with message

4. **PRIORITAS 4 (MEDIUM)**: Fix performance
   - Coordinate dengan: Index.tsx, ConversationList.tsx
   - Test: Network tab → Should have less requests

---

**Dokumentasi dibuat**: 29 April 2026, 16:30 WIB
**Developer**: idinhilmansyah-svg
**Reviewer**: Needed for next session
**Status**: READY FOR NEXT SESSION