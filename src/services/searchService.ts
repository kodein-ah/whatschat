// src/services/searchService.ts
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export interface SearchResponse {
  success: boolean;
  query: string;
  type: "email" | "phone";
  total: number;
  count: number;
  users: User[];
}

export const searchService = {
  /**
   * ✅ FIXED: Search users by email atau phone
   * 
   * Response dari backend:
   * {
   *   success: true,
   *   query: "idinceliboy@gmail.com",
   *   type: "email",
   *   total: 1,
   *   count: 1,
   *   users: [{ id, name, email, phone_number, avatar, status, online, last_seen_at }]
   * }
   */
  async searchUsers(query: string, type?: "email" | "phone"): Promise<SearchResponse> {
    try {
      // ✅ STEP 1: Build query params
      const params = new URLSearchParams({
        q: query,
        ...(type && { type })
      });

      // ✅ STEP 2: Call API
      const response = await api.get<SearchResponse>(`/users/search?${params}`);

      // ✅ STEP 3: Log untuk debugging
      console.log("✅ [Search] API Response:", {
        query,
        type: response.data.type,
        total: response.data.total,
        count: response.data.count,
        usersFound: response.data.users?.length || 0,
        users: response.data.users
      });

      // ✅ STEP 4: Validate response structure
      if (!response.data.success) {
        console.warn("[Search] Response success=false", response.data);
        return {
          ...response.data,
          users: []
        };
      }

      // ✅ STEP 5: Ensure users is array
      if (!Array.isArray(response.data.users)) {
        console.warn("[Search] Response.users is not array", response.data.users);
        return {
          ...response.data,
          users: []
        };
      }

      return response.data;

    } catch (error: any) {
      // ✅ ERROR HANDLING
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      const errorStatus = error.response?.status || "unknown";

      console.error("❌ [Search] Error:", {
        status: errorStatus,
        message: errorMsg,
        data: error.response?.data,
        fullError: error
      });

      throw error;
    }
  },

  /**
   * ✅ IMPROVED: Detect search type berdasarkan format query
   * 
   * Rules:
   * 1. Jika ada @ → email
   * 2. Jika start dengan 0, +, atau 62 → phone
   * 3. Jika numeric 9+ digits → phone
   * 4. Default → email
   */
  detectSearchType(query: string): "email" | "phone" {
    const cleanQuery = query.trim().replace(/\s/g, "");

    // ✅ Rule 1: Contains @ → Email
    if (cleanQuery.includes("@")) {
      console.log(`[DetectType] "${query}" → email (has @)`);
      return "email";
    }

    // ✅ Rule 2: Starts with phone prefix
    if (cleanQuery.match(/^(\+?62|0)/)) {
      const digitsOnly = cleanQuery.replace(/\D/g, "");
      if (digitsOnly.length >= 9) {
        console.log(`[DetectType] "${query}" → phone (starts with 0/+62/62)`);
        return "phone";
      }
    }

    // ✅ Rule 3: All digits 9+ length → Phone
    if (/^\d{9,15}$/.test(cleanQuery)) {
      console.log(`[DetectType] "${query}" → phone (${cleanQuery.length} digits)`);
      return "phone";
    }

    // ✅ Rule 4: Default to email
    console.log(`[DetectType] "${query}" → email (default)`);
    return "email";
  },

  /**
   * ✅ UTILITY: Format phone untuk display
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\s/g, "");

    if (cleaned.startsWith("+62")) {
      return "0" + cleaned.slice(3);
    }

    if (cleaned.startsWith("62")) {
      return "0" + cleaned.slice(2);
    }

    return cleaned;
  },

  /**
   * ✅ UTILITY: Validate phone format
   */
  validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\s/g, "");
    return /^(\+?62|0)[0-9]{9,14}$/.test(cleaned);
  }
};