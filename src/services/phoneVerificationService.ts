import { api } from "@/lib/api";

interface OTPResponse {
  success: boolean;
  message: string;
  expires_in?: number;
}

interface OTPVerifyResponse {
  success: boolean;
  message: string;
  phone_number?: string;
}

/**
 * Phone verification service untuk handle:
 * 1. Phone number validation & formatting
 * 2. Request OTP
 * 3. Verify OTP
 * 4. Resend OTP
 */
export const phoneVerificationService = {
  /**
   * Validate phone number format
   * Accepted: 08xxx... atau +62xxx... (10-15 digits)
   */
  validatePhoneNumber(phone: string): boolean {
    // Remove whitespace
    const cleaned = phone.replace(/\s/g, "");

    // Pattern: 08xxx atau +62xxx
    const phoneRegex = /^(\+?62|0)[0-9]{9,14}$/;

    return phoneRegex.test(cleaned);
  },

  /**
   * Format phone number ke format standar
   * 08123456789 atau +62123456789 → 08123456789
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\s/g, "");

    // Jika diawali +62, convert ke 08
    if (cleaned.startsWith("+62")) {
      return "0" + cleaned.slice(3);
    }

    return cleaned;
  },

  /**
   * Request OTP via backend
   * POST /api/auth/phone/request-otp
   */
  async requestOTP(phone: string, email: string): Promise<OTPResponse> {
    try {
      const { data } = await api.post<OTPResponse>(
        "/auth/phone/request-otp",
        {
          phone_number: phone,
          email: email,
        }
      );
      return data;
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Terjadi kesalahan saat mengirim OTP",
      };
    }
  },

  /**
   * Verify OTP via backend
   * POST /api/auth/phone/verify-otp
   */
  async verifyOTP(phone: string, otp: string): Promise<OTPVerifyResponse> {
    try {
      const { data } = await api.post<OTPVerifyResponse>(
        "/auth/phone/verify-otp",
        {
          phone_number: phone,
          otp_code: otp,
        }
      );
      return data;
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Terjadi kesalahan saat verifikasi OTP",
      };
    }
  },

  /**
   * Resend OTP via backend
   * POST /api/auth/phone/resend-otp
   */
  async resendOTP(phone: string, email: string): Promise<OTPResponse> {
    try {
      const { data } = await api.post<OTPResponse>(
        "/api/auth/phone/resend-otp",
        {
          phone_number: phone,
          email: email,
        }
      );
      return data;
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Terjadi kesalahan saat mengirim ulang OTP",
      };
    }
  },
};