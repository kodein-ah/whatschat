<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PhoneService;
use App\Services\OTPService;
use Illuminate\Http\Request;

class PhoneVerificationController extends Controller
{
    public function __construct(
        private PhoneService $phoneService,
        private OTPService $otpService
    ) {}

    /**
     * Request OTP ke email user
     * POST /api/auth/phone/request-otp
     */
    public function requestOTP(Request $request)
    {
        try {
            $validated = $request->validate([
                'phone_number' => 'required|string',
                'email' => 'required|email',
            ]);

            // Validasi format nomor HP
            if (!$this->phoneService->validatePhoneNumber($validated['phone_number'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format nomor HP tidak valid. Gunakan 08xxx atau +62xxx',
                ], 422);
            }

            // Format nomor
            $formatted = $this->phoneService->formatPhoneNumber($validated['phone_number']);

            // Cek apakah sudah terdaftar
            if ($this->phoneService->isPhoneRegistered($formatted)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor HP sudah terdaftar di aplikasi',
                ], 422);
            }

            // Generate OTP
            $otp = $this->otpService->generateOTP();

            // Simpan ke database via OTPService
            $this->otpService->storeOTP($formatted, $otp);

            // Kirim email via GAS
            $sendResult = $this->otpService->sendOTPViaEmail(
                $validated['email'],
                $otp,
                $formatted
            );

            if (!$sendResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim OTP: ' . $sendResult['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'OTP berhasil dikirim ke email Anda',
                'expires_in' => 600, // 10 menit
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify OTP dari user
     * POST /api/auth/phone/verify-otp
     */
    public function verifyOTP(Request $request)
    {
        try {
            $validated = $request->validate([
                'phone_number' => 'required|string',
                'otp_code' => 'required|string|size:6',
            ]);

            // Format nomor
            $formatted = $this->phoneService->formatPhoneNumber($validated['phone_number']);

            // Verify OTP
            $verifyResult = $this->otpService->verifyOTP($formatted, $validated['otp_code']);

            if (!$verifyResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $verifyResult['message'],
                ], 422);
            }

            return response()->json([
                'success' => true,
                'message' => 'Nomor HP berhasil diverifikasi',
                'phone_number' => $formatted,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resend OTP
     * POST /api/auth/phone/resend-otp
     */
    public function resendOTP(Request $request)
    {
        try {
            $validated = $request->validate([
                'phone_number' => 'required|string',
                'email' => 'required|email',
            ]);

            // Format nomor
            $formatted = $this->phoneService->formatPhoneNumber($validated['phone_number']);

            // Delete OTP lama
            $this->otpService->deleteOTP($formatted);

            // Generate OTP baru
            $otp = $this->otpService->generateOTP();

            // Simpan ke database
            $this->otpService->storeOTP($formatted, $otp);

            // Kirim email
            $sendResult = $this->otpService->sendOTPViaEmail(
                $validated['email'],
                $otp,
                $formatted
            );

            if (!$sendResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim OTP: ' . $sendResult['message'],
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'OTP baru berhasil dikirim ke email',
                'expires_in' => 600,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }
}