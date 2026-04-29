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
     * Cari users berdasarkan email atau nomor telepon
     * 
     * GET /api/users/search?q=query&type=email|phone
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function searchUsers(Request $request): JsonResponse
    {
        try {
            // ✅ STEP 1: Validasi input
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

            // ✅ STEP 2: Check total users di database
            $totalUsersInDB = User::count();
            Log::info('[SEARCH:DEBUG] Status database', [
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

            // ✅ STEP 3: Log pencarian
            Log::info('[SEARCH] Pencarian baru', [
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

            // ✅ STEP 6: Convert ke array dengan aman
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

            // ✅ STEP 7: Log hasil
            Log::info('[SEARCH] Hasil pencarian', [
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
     * Cari berdasarkan email
     */
    private function searchByEmail(string $email): Collection
    {
        $email = strtolower(trim($email));

        // ✅ Build query
        Log::debug('[SEARCH:EMAIL] Mencari email', [
            'email_search' => $email,
        ]);

        // Execute
        $users = User::query()
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

        Log::info('[SEARCH:EMAIL] Hasil', [
            'email' => $email,
            'found' => $users->count(),
        ]);

        return $users;
    }

    /**
     * Cari berdasarkan nomor telepon
     * ✅ PERBAIKAN: Sekarang generate 5 variasi format nomor
     */
    private function searchByPhone(string $phone): Collection
    {
        $phone = trim($phone);
        $variations = $this->getPhoneVariations($phone);

        Log::debug('[SEARCH:PHONE] Variasi nomor', [
            'original' => $phone,
            'variations' => $variations,
        ]);

        // ✅ PERBAIKAN: Gunakan where() callback untuk proper OR grouping
        $users = User::where(function ($query) use ($variations) {
            foreach ($variations as $i => $variation) {
                if ($i === 0) {
                    // Kondisi pertama
                    $query->where('phone_number', $variation)
                          ->orWhere('phone_number', 'LIKE', "%{$variation}%");
                } else {
                    // Kondisi berikutnya
                    $query->orWhere('phone_number', $variation)
                          ->orWhere('phone_number', 'LIKE', "%{$variation}%");
                }
            }
        })
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

        Log::info('[SEARCH:PHONE] Hasil', [
            'phone' => $phone,
            'variations' => $variations,
            'found' => $users->count(),
        ]);

        return $users;
    }

    /**
     * Generate 5 variasi format nomor telepon Indonesia
     * ✅ PERBAIKAN: Logic yang lebih baik
     * 
     * Contoh:
     * Input: "083853779661"
     * Output: ["083853779661", "+628385377966", "628385377966", "3853779661"]
     */
    private function getPhoneVariations(string $phone): array
    {
        $variations = [];

        // Hapus semua karakter kecuali digit dan +
        $cleaned = preg_replace('/[^\d\+]/', '', $phone);

        if (empty($cleaned)) {
            return [];
        }

        // ✅ Variasi 1: Original (as-is)
        $variations[] = $cleaned;

        // ✅ Variasi 2: Convert ke format +62
        if (str_starts_with($cleaned, '0')) {
            // 08xxx -> +628xxx
            $variations[] = '+62' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '62')) {
            // 628xxx -> +628xxx
            $variations[] = '+' . $cleaned;
        }

        // ✅ Variasi 3: Convert ke format 0
        if (str_starts_with($cleaned, '+62')) {
            // +628xxx -> 08xxx
            $variations[] = '0' . substr($cleaned, 3);
        } elseif (str_starts_with($cleaned, '62') && !str_starts_with($cleaned, '+')) {
            // 628xxx -> 08xxx
            $variations[] = '0' . substr($cleaned, 2);
        }

        // ✅ Variasi 4: Format 62 tanpa +
        if (str_starts_with($cleaned, '0')) {
            // 08xxx -> 628xxx
            $variations[] = '62' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '+62')) {
            // +628xxx -> 628xxx
            $variations[] = '62' . substr($cleaned, 1);
        }

        // ✅ Variasi 5: Last 9-10 digits (untuk partial search)
        $digitsOnly = preg_replace('/\D/', '', $cleaned);
        if (strlen($digitsOnly) >= 9) {
            $lastDigits = substr($digitsOnly, -10);
            if (!in_array($lastDigits, $variations)) {
                $variations[] = $lastDigits;
            }
        }

        // Remove duplicates & return
        return array_values(array_filter(array_unique($variations)));
    }

    /**
     * Deteksi tipe pencarian (email atau phone)
     */
    private function detectSearchType(string $query): string
    {
        // Jika ada @, pasti email
        if (str_contains($query, '@')) {
            return 'email';
        }

        // Jika mulai dengan 0, +, atau 62 = phone
        if (str_starts_with($query, '0') || str_starts_with($query, '+') || str_starts_with($query, '62')) {
            return 'phone';
        }

        // Jika hanya digit dan panjang >= 9 = phone
        $digitsOnly = preg_replace('/\D/', '', $query);
        if (strlen($digitsOnly) >= 9 && $digitsOnly === $query) {
            return 'phone';
        }

        // Default: email
        return 'email';
    }

    /**
     * DEBUG: Get search statistics
     */
    public function searchStats(): JsonResponse
    {
        try {
            // ✅ Get semua users
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