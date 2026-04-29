<?php

namespace App\Services;

class PhoneService
{
    /**
     * Format nomor HP ke format +62
     * Input: 081234567890 atau +6281234567890
     * Output: +6281234567890
     */
    public function formatPhoneNumber(string $phone): string
    {
        // Hapus semua karakter selain angka
        $cleaned = preg_replace('/\D/', '', $phone);

        // Jika dimulai dengan 0, ganti jadi +62
        if (str_starts_with($cleaned, '0')) {
            return '+62' . substr($cleaned, 1);
        }

        // Jika sudah +62 atau 62
        if (str_starts_with($cleaned, '62')) {
            return '+' . $cleaned;
        }

        // Default: tambah +62
        return '+62' . $cleaned;
    }

    /**
     * Validasi format nomor HP Indonesia
     * Harus 10-12 digit setelah +62
     */
    public function validatePhoneNumber(string $phone): bool
    {
        $formatted = $this->formatPhoneNumber($phone);

        // Check format: +62 + 10-12 digit
        if (!preg_match('/^\+62\d{10,12}$/', $formatted)) {
            return false;
        }

        return true;
    }

    /**
     * Cek apakah nomor HP sudah terdaftar
     */
    public function isPhoneRegistered(string $phone): bool
    {
        $formatted = $this->formatPhoneNumber($phone);
        
        return \App\Models\User::where('phone_number', $formatted)->exists();
    }

    /**
     * Get user by phone number
     */
    public function getUserByPhone(string $phone): ?\App\Models\User
    {
        $formatted = $this->formatPhoneNumber($phone);
        
        return \App\Models\User::where('phone_number', $formatted)->first();
    }

    /**
     * Get user by email atau phone number
     */
    public function getUserByEmailOrPhone(string $search): ?\App\Models\User
    {
        $formatted = $this->formatPhoneNumber($search);

        return \App\Models\User::where('email', $search)
            ->orWhere('phone_number', $formatted)
            ->first();
    }
}