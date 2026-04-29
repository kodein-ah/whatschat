<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class OTPService
{
    /**
     * Generate random 6-digit OTP
     */
    public function generateOTP(): string
    {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Simpan OTP ke database (table: phone_verifications)
     */
    public function storeOTP(string $phoneNumber, string $otp): void
    {
        // Delete OTP lama jika ada
        DB::table('phone_verifications')
            ->where('phone_number', $phoneNumber)
            ->delete();

        // Insert OTP baru
        DB::table('phone_verifications')->insert([
            'phone_number' => $phoneNumber,
            'otp_code' => $otp,
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Verify OTP
     */
    public function verifyOTP(string $phoneNumber, string $otp): array
    {
        $record = DB::table('phone_verifications')
            ->where('phone_number', $phoneNumber)
            ->latest()
            ->first();

        // OTP tidak ditemukan
        if (!$record) {
            return [
                'success' => false,
                'message' => 'OTP tidak ditemukan',
            ];
        }

        // OTP sudah expired
        if (now() > $record->expires_at) {
            return [
                'success' => false,
                'message' => 'OTP sudah expired. Minta OTP baru.',
            ];
        }

        // Sudah 3x salah
        if ($record->attempts >= 3) {
            return [
                'success' => false,
                'message' => 'Maksimal 3x percobaan salah. Minta OTP baru.',
            ];
        }

        // OTP tidak cocok
        if ($record->otp_code !== $otp) {
            DB::table('phone_verifications')
                ->where('id', $record->id)
                ->increment('attempts');
            
            return [
                'success' => false,
                'message' => 'OTP salah. Coba lagi.',
            ];
        }

        // OTP BENAR! Hapus record
        DB::table('phone_verifications')
            ->where('id', $record->id)
            ->delete();

        return [
            'success' => true,
            'message' => 'OTP verified',
        ];
    }

    /**
     * Delete OTP record
     */
    public function deleteOTP(string $phoneNumber): void
    {
        DB::table('phone_verifications')
            ->where('phone_number', $phoneNumber)
            ->delete();
    }

    /**
     * Kirim OTP via Email (via GAS)
     */
    public function sendOTPViaEmail(string $email, string $otp, string $phoneNumber): array
    {
        try {
            $gasUrl = env('GAS_STORAGE_URL'); // GAS deployment URL
            
            if (!$gasUrl) {
                return [
                    'success' => false,
                    'message' => 'GAS URL tidak dikonfigurasi',
                ];
            }

            // Kirim ke GAS endpoint
            $response = Http::timeout(30)->post($gasUrl, [
                'type' => 'send_otp_email', // Type buat differentiate request
                'email' => $email,
                'otp' => $otp,
                'phoneNumber' => $phoneNumber,
            ]);

            $result = $response->json();

            if ($result['success'] ?? false) {
                return [
                    'success' => true,
                    'message' => 'Email OTP sent',
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Unknown error',
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error sending email: ' . $e->getMessage(),
            ];
        }
    }
}