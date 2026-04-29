// src/pages/Chat.tsx (UPDATE - ADD SEARCH)
import { useState } from "react";
import { SearchUsers } from "@/components/SearchUsers";
import type { User } from "@/lib/types";

export const Chat = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setShowSearch(false);
    // TODO: Create/open conversation with user
  };

  return (
    <div className="flex h-screen">
      {/* Chat List */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b flex gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex-1 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
          >
            + Cari Pengguna
          </button>
        </div>

        {showSearch && (
          <div className="p-4 border-b">
            <SearchUsers
              onSelectUser={handleSelectUser}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}

        {/* Chat list items */}
        <div className="space-y-1 p-2">
          {/* TODO: Map conversations */}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {selectedUser ? (
          <div className="text-center">
            <p className="text-lg font-semibold">{selectedUser.name}</p>
            <p className="text-sm">{selectedUser.email}</p>
          </div>
        ) : (
          "Pilih percakapan atau cari pengguna"
        )}
      </div>
    </div>
  );
};