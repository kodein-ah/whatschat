import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from 'react';
// [JEBRED] INI DIA KUNCINYA! Panggil 'echo' (kecil), ganti nama jadi 'Echo' (besar)
import { echo as Echo } from '../lib/echo'; 
import { useAuth } from './AuthContext';

// Definisikan tipe untuk user yang datang dari Presence Channel
interface PresenceUser {
  id: number;
  name: string;
  avatar: string | null;
}

// Definisikan tipe untuk nilai yang akan disediakan oleh Context
interface OnlineStatusContextType {
  onlineUserIds: number[];
}

// Buat Context-nya
const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

// Props untuk Provider
interface OnlineStatusProviderProps {
  children: ReactNode;
}

// Ini dia komponen Provider-nya, si "Otak" utama
export const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({ children }) => {
  const { user } = useAuth(); // Ambil status user dari AuthContext
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  useEffect(() => {
    // KONDISI PENTING: Jangan join channel kalau user belum login.
    if (!user) {
      if (onlineUserIds.length > 0) {
        setOnlineUserIds([]);
      }
      return;
    }

    // Sambungkan ke Presence Channel 'online-users' yang kita buat di Laravel
    const channel = Echo.join('online-users');

    // Event 'here': Dijalankan SEKALI saat kita berhasil join channel.
    channel.here((users: PresenceUser[]) => {
      console.log('Successfully joined presence channel. Users here:', users);
      setOnlineUserIds(users.map(u => u.id));
    });

    // Event 'joining': Dijalankan setiap kali ada USER BARU yang masuk.
    channel.joining((joiningUser: PresenceUser) => {
      console.log('User joining:', joiningUser);
      setOnlineUserIds(prevIds => {
        if (!prevIds.includes(joiningUser.id)) {
          return [...prevIds, joiningUser.id];
        }
        return prevIds;
      });
    });

    // Event 'leaving': Dijalankan setiap kali ada user yang KELUAR.
    channel.leaving((leavingUser: PresenceUser) => {
      console.log('User leaving:', leavingUser);
      setOnlineUserIds(prevIds => prevIds.filter(id => id !== leavingUser.id));
    });
    
    // Error handler, buat jaga-jaga
    channel.error((error: any) => {
        console.error("Laravel Echo Presence Channel Error:", error);
    });

    // FUNGSI PENTING: Cleanup!
    return () => {
      console.log("Leaving presence channel...");
      Echo.leave('online-users');
    };
  }, [user]);

  const value = { onlineUserIds };

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
};

// Custom Hook: Biar komponen lain tinggal manggil ini, gak perlu useContext manual
export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
};