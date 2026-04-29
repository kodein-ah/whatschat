<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SearchController
{
    /**
     * Search users by email or phone number
     * 
     * GET /api/users/search?q=query&type=email|phone
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function searchUsers(Request $request): JsonResponse
    {
        try {
            // ✅ STEP 1: Validate input
            $validated = $request->validate([
                'q' => 'required|string|min:2|max:255',
                'type' => 'nullable|in:email,phone',
            ]);

            $query = trim($validated['q']);
            $type = $validated['type'] ?? $this->detectSearchType($query);

            if (empty($query)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Query tidak boleh kosong',
                    'users' => [],
                ], 400);
            }

            // ✅ STEP 2: Check total users in database
            $totalUsersInDB = User::count();
            Log::info('[SEARCH:DEBUG] Database status', [
                'total_users' => $totalUsersInDB,
            ]);

            if ($totalUsersInDB === 0) {
                Log::warning('[SEARCH:DEBUG] Database kosong!');
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada user di database',
                    'users' => [],
                ], 404);
            }

            // ✅ STEP 3: Log incoming search
            Log::info('[SEARCH] Incoming search', [
                'query' => $query,
                'type' => $type,
                'user_id' => auth()->id(),
                'timestamp' => now(),
            ]);

            // ✅ STEP 4: Execute search
            $results = match ($type) {
                'email' => $this->searchByEmail($query),
                'phone' => $this->searchByPhone($query),
                default => collect(),
            };

            if ($results === null) {
                $results = collect();
            }

            // ✅ STEP 5: Exclude current user
            $currentUserId = auth()->id();
            if ($currentUserId) {
                $results = $results->reject(function ($user) use ($currentUserId) {
                    return $user->id == $currentUserId;
                });
            }

            // ✅ STEP 6: Convert to array safely
            $usersArray = [];
            foreach ($results as $user) {
                $usersArray[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'avatar' => $user->avatar,
                    'status' => $user->status,
                    'online' => (bool) $user->online,
                    'last_seen_at' => $user->last_seen_at,
                ];
            }

            // ✅ STEP 7: Log results
            Log::info('[SEARCH] Results', [
                'query' => $query,
                'type' => $type,
                'count' => count($usersArray),
                'user_ids' => collect($usersArray)->pluck('id')->toArray(),
            ]);

            return response()->json([
                'success' => true,
                'query' => $query,
                'type' => $type,
                'total' => count($usersArray),
                'count' => count($usersArray),
                'users' => $usersArray,
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[SEARCH] Validation error', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
                'users' => [],
            ], 422);

        } catch (\Exception $e) {
            Log::error('[SEARCH] Exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan server: ' . $e->getMessage(),
                'users' => [],
            ], 500);
        }
    }

    /**
     * Search by email
     */
    private function searchByEmail(string $email): Collection
    {
        $email = strtolower(trim($email));

        // ✅ Build query
        $query = User::query();

        // Log SQL
        Log::debug('[SEARCH:EMAIL] Query builder', [
            'email_search' => $email,
        ]);

        // Execute
        $users = $query
            ->where('email', 'LIKE', "%{$email}%")
            ->where('email', '!=', '')
            ->select(
                'id',
                'name',
                'email',
                'phone_number',
                'avatar',
                'status',
                'online',
                'last_seen_at'
            )
            ->limit(20)
            ->get();

        Log::info('[SEARCH:EMAIL] Results', [
            'email' => $email,
            'found' => $users->count(),
            'sql' => DB::getQueryLog(),
        ]);

        return $users;
    }

    /**
     * Search by phone
     */
    private function searchByPhone(string $phone): Collection
    {
        $phone = trim($phone);
        $variations = $this->getPhoneVariations($phone);

        Log::debug('[SEARCH:PHONE] Variations', [
            'original' => $phone,
            'variations' => $variations,
        ]);

        $users = User::query();

        // Build OR conditions
        $isFirst = true;
        foreach ($variations as $variation) {
            if ($isFirst) {
                $users = $users->where('phone_number', $variation);
                $isFirst = false;
            } else {
                $users = $users->orWhere('phone_number', $variation)
                               ->orWhere('phone_number', 'LIKE', "%{$variation}%");
            }
        }

        $results = $users
            ->where('phone_number', '!=', '')
            ->select(
                'id',
                'name',
                'email',
                'phone_number',
                'avatar',
                'status',
                'online',
                'last_seen_at'
            )
            ->limit(20)
            ->get();

        Log::info('[SEARCH:PHONE] Results', [
            'phone' => $phone,
            'found' => $results->count(),
        ]);

        return $results;
    }

    /**
     * Get phone variations
     */
    private function getPhoneVariations(string $phone): array
    {
        $variations = [];
        $cleaned = preg_replace('/\s+/', '', $phone);
        $digits = preg_replace('/[^\d\+]/', '', $cleaned);

        if (!empty($digits)) {
            $variations[] = $digits;
        }

        if (str_starts_with($digits, '+62')) {
            $formatted = '0' . substr($digits, 3);
            if (!in_array($formatted, $variations)) {
                $variations[] = $formatted;
            }
        } elseif (str_starts_with($digits, '62')) {
            $formatted = '0' . substr($digits, 2);
            if (!in_array($formatted, $variations)) {
                $variations[] = $formatted;
            }
        }

        if (str_starts_with($digits, '0')) {
            $formatted = '+62' . substr($digits, 1);
            if (!in_array($formatted, $variations)) {
                $variations[] = $formatted;
            }
        }

        return array_filter(array_unique($variations));
    }

    /**
     * Detect search type
     */
    private function detectSearchType(string $query): string
    {
        if (str_contains($query, '@')) {
            return 'email';
        }

        if (str_starts_with($query, '0') || str_starts_with($query, '+') || str_starts_with($query, '62')) {
            return 'phone';
        }

        $digitsOnly = preg_replace('/\D/', '', $query);
        if (strlen($digitsOnly) >= 9 && $digitsOnly === $query) {
            return 'phone';
        }

        return 'email';
    }

    /**
     * DEBUG: Get search statistics
     */
    public function searchStats(): JsonResponse
    {
        try {
            // ✅ Get all users
            $allUsers = User::select('id', 'name', 'email', 'phone_number')->get();

            Log::info('[SEARCH:STATS] Database dump', [
                'total' => $allUsers->count(),
                'users' => $allUsers->toArray(),
            ]);

            return response()->json([
                'success' => true,
                'stats' => [
                    'total_users' => $allUsers->count(),
                    'users_with_email' => $allUsers->where('email', '!=', '')->count(),
                    'users_with_phone' => $allUsers->where('phone_number', '!=', '')->count(),
                ],
                'all_users' => $allUsers->toArray(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}