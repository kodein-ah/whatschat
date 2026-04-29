<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Auth\PhoneVerificationController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes - NEXUS WHATCHAT CORE
|--------------------------------------------------------------------------
| Base URL: /api
| Version: v1.6.0 (Phase 4 - Fixed Conversations & Search)
| Last Updated: 29 April 2026, 16:00 WIB
|--------------------------------------------------------------------------
*/

// ============================================================================
// 🔓 PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================================================

// 🔐 Authentication Routes
Route::post('/register', [AuthController::class, 'register'])
    ->name('auth.register');

Route::post('/login', [AuthController::class, 'login'])
    ->name('auth.login');

// 📱 Phone Verification (OTP Flow)
Route::post('/auth/phone/request-otp', [PhoneVerificationController::class, 'requestOTP'])
    ->name('auth.phone.request-otp');

Route::post('/auth/phone/verify-otp', [PhoneVerificationController::class, 'verifyOTP'])
    ->name('auth.phone.verify-otp');

Route::post('/auth/phone/resend-otp', [PhoneVerificationController::class, 'resendOTP'])
    ->name('auth.phone.resend-otp');

// ============================================================================
// 🔒 PROTECTED ROUTES (REQUIRES: Authorization: Bearer TOKEN)
// ============================================================================

Route::middleware('auth:sanctum')->group(function () {

    // ────────────────────────────────────────────────────────────────────
    // 👤 PROFILE MANAGEMENT
    // ────────────────────────────────────────────────────────────────────
    
    Route::prefix('/me')->group(function () {
        // ✅ GET current user profile
        Route::get('/', function (Request $request) {
            try {
                $user = $request->user();
                
                return response()->json([
                    'success' => true,
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'avatar' => $user->avatar,
                    'status' => $user->status,
                    'online' => (bool) $user->online,
                    'last_seen_at' => $user->last_seen_at?->toIso8601String(),
                ], 200);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal memuat profil: ' . $e->getMessage(),
                ], 500);
            }
        })
        ->name('profile.show');

        // ✅ UPDATE current user profile
        Route::put('/', function (Request $request) {
            try {
                $validated = $request->validate([
                    'name' => 'nullable|string|max:255',
                    'status' => 'nullable|string|max:255',
                    'avatar' => 'nullable|string|url',
                ]);

                $user = $request->user();
                $user->update($validated);

                return response()->json([
                    'success' => true,
                    'message' => 'Profil berhasil diperbarui',
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'avatar' => $user->avatar,
                    'status' => $user->status,
                    'online' => (bool) $user->online,
                ], 200);
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $e->errors(),
                ], 422);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal update profil: ' . $e->getMessage(),
                ], 500);
            }
        })
        ->name('profile.update');
    });

    // ────────────────────────────────────────────────────────────────────
    // 🔍 USER SEARCH (EMAIL + PHONE DUAL SEARCH)
    // ────────────────────────────────────────────────────────────────────
    // 
    // Endpoints:
    // - GET /api/users/search?q={query}&type={email|phone}
    // - GET /api/users/search/stats (debug only)
    //
    // Features:
    // - Email search: LIKE partial matching
    // - Phone search: Multiple format variations support
    // - Auto-detect: Type detection based on query format
    // - Exclude self: Current user not in results
    // - Rate limiting: 60 requests per minute
    // ────────────────────────────────────────────────────────────────────

    Route::prefix('/users')->group(function () {
        // ✅ Search users by email or phone
        Route::get('/search', [SearchController::class, 'searchUsers'])
            ->name('users.search')
            ->middleware('throttle:60,1'); // 60 requests per minute

        // ✅ DEBUG: Search statistics (for testing)
        Route::get('/search/stats', [SearchController::class, 'searchStats'])
            ->name('users.search.stats');
    });

    // ────────────────────────────────────────────────────────────────────
    // 💬 CHAT & CONVERSATIONS
    // ────────────────────────────────────────────────────────────────────
    //
    // Endpoints:
    // - GET /api/conversations (list all)
    // - POST /api/conversations/start (create new)
    // - GET /api/conversations/{id}/messages (get history)
    // - POST /api/conversations/{id}/messages (send message)
    // - POST /api/conversations/{id}/read (mark as read)
    // - POST /api/conversations/{id}/delivered (mark as delivered)
    //
    // Query Parameters:
    // - GET /conversations?limit=20&offset=0
    //
    // Response Format:
    // {
    //   "id": "1",
    //   "is_group": false,
    //   "name": "Chat Name",
    //   "avatar": "url",
    //   "participants": [...],
    //   "last_message": {...},
    //   "unread_count": 0,
    //   "updated_at": "2026-04-29T16:00:00Z"
    // }
    // ────────────────────────────────────────────────────────────────────

    Route::prefix('/conversations')->group(function () {
        // ✅ List all conversations for current user
        Route::get('/', [ChatController::class, 'listConversations'])
            ->name('conversations.index');

        // ✅ Start new conversation with user
        Route::post('/start', [ChatController::class, 'startChat'])
            ->name('conversations.start')
            ->middleware('throttle:30,1'); // 30 requests per minute

        // ✅ Conversation-specific operations
        Route::prefix('/{conversation}')->group(function () {
            
            // ✅ Get message history dari conversation
            Route::get('/messages', [ChatController::class, 'index'])
                ->name('conversations.messages.index');

            // ✅ Send new message ke conversation
            Route::post('/messages', [ChatController::class, 'store'])
                ->name('conversations.messages.store')
                ->middleware('throttle:100,1'); // 100 requests per minute

            // ✅ MESSAGE STATUS: Mark as Read (Centang 2 Biru)
            // Triggered when: User membuka conversation
            // Indicates: Penerima sudah membaca pesan
            Route::post('/read', [ChatController::class, 'markRead'])
                ->name('conversations.mark-read')
                ->middleware('throttle:60,1');

            // ✅ MESSAGE STATUS: Mark as Delivered (Centang 2 Abu-abu)
            // Triggered when: Message tiba di device penerima
            // Indicates: Pesan sudah sampai, tapi belum dibaca
            Route::post('/delivered', [ChatController::class, 'markDelivered'])
                ->name('conversations.mark-delivered')
                ->middleware('throttle:60,1');
        });
    });

    // ────────────────────────────────────────────────────────────────────
    // 🚪 AUTHENTICATION ACTIONS
    // ────────────────────────────────────────────────────────────────────

    Route::post('/logout', [AuthController::class, 'logout'])
        ->name('auth.logout');

});

// ============================================================================
// ⚠️ CATCH-ALL ERROR HANDLER
// ============================================================================

Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'Endpoint tidak ditemukan',
        'status' => 404,
        'path' => request()->path(),
        'method' => request()->method(),
        'timestamp' => now()->toIso8601String(),
    ], 404);
});