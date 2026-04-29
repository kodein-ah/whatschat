// src/components/SearchUsers.tsx (NEW FILE)
import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { searchService } from "@/services/searchService";
import type { User } from "@/lib/types";
import { toast } from "sonner";

interface SearchUsersProps {
  onSelectUser: (user: User) => void;
  onClose?: () => void;
}

export const SearchUsers = ({ onSelectUser, onClose }: SearchUsersProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Masukkan pencarian");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const type = searchService.detectSearchType(query);
      const result = await searchService.searchUsers(query, type);
      setResults(result.users);

      if (result.users.length === 0) {
        toast.info("Pengguna tidak ditemukan");
      }
    } catch (err) {
      toast.error("Gagal mencari pengguna");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Cari Pengguna</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nama, email, atau nomor HP..."
            className="pl-10"
            type="text"
          />
        </div>
        <Button type="submit" disabled={loading} className="h-10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
        </Button>
      </form>

      {hasSearched && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                      {user.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email || user.phone_number}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Pengguna tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
};