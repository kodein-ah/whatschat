import type { Conversation, Message, User } from "./types";

export const mockMe: User = {
  id: "me",
  name: "Saya",
  phone: "+62 812-0000-0001",
  status: "Tersedia",
  online: true,
};

const users: Record<string, User> = {
  budi: { id: "budi", name: "Budi Santoso", status: "online", online: true },
  rina: { id: "rina", name: "Rina Wulandari", status: "Lagi sibuk 💼", online: false, last_seen: "10 menit lalu" },
  tim: { id: "tim", name: "Tim Frontend", status: "5 anggota" },
  ayah: { id: "ayah", name: "Ayah", online: false, last_seen: "kemarin 21:14" },
  dewi: { id: "dewi", name: "Dewi Lestari", online: true },
};

const now = Date.now();
const t = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", conversation_id: "c1", sender_id: "budi", type: "text", body: "Halo bro, jadi nongkrong nanti?", created_at: t(120), status: "read" },
    { id: "m2", conversation_id: "c1", sender_id: "me", type: "text", body: "Jadi dong! Jam berapa?", created_at: t(118), status: "read" },
    { id: "m3", conversation_id: "c1", sender_id: "budi", type: "text", body: "Jam 7 di tempat biasa ya 🍻", created_at: t(115), status: "read" },
    { id: "m4", conversation_id: "c1", sender_id: "me", type: "text", body: "Sip, gas!", created_at: t(5), status: "delivered" },
  ],
  c2: [
    { id: "m1", conversation_id: "c2", sender_id: "rina", type: "text", body: "File desainnya udah aku kirim ya", created_at: t(300), status: "read" },
    { id: "m2", conversation_id: "c2", sender_id: "me", type: "text", body: "Oke makasih, aku review dulu", created_at: t(298), status: "read" },
  ],
  c3: [
    { id: "m1", conversation_id: "c3", sender_id: "dewi", type: "text", body: "Standup jam 10 ya tim 🚀", created_at: t(60), status: "read" },
    { id: "m2", conversation_id: "c3", sender_id: "budi", type: "text", body: "Siap!", created_at: t(58), status: "read" },
    { id: "m3", conversation_id: "c3", sender_id: "rina", type: "text", body: "Aku telat 5 menit ya", created_at: t(55), status: "read" },
  ],
  c4: [
    { id: "m1", conversation_id: "c4", sender_id: "ayah", type: "text", body: "Jangan lupa pulang malam ini", created_at: t(1440), status: "read" },
  ],
};

export const mockConversations: Conversation[] = [
  {
    id: "c1",
    is_group: false,
    name: users.budi.name,
    participants: [users.budi],
    last_message: mockMessages.c1.at(-1),
    unread_count: 0,
    updated_at: mockMessages.c1.at(-1)!.created_at,
  },
  {
    id: "c3",
    is_group: true,
    name: "Tim Frontend",
    participants: [users.budi, users.rina, users.dewi],
    last_message: mockMessages.c3.at(-1),
    unread_count: 2,
    updated_at: mockMessages.c3.at(-1)!.created_at,
  },
  {
    id: "c2",
    is_group: false,
    name: users.rina.name,
    participants: [users.rina],
    last_message: mockMessages.c2.at(-1),
    unread_count: 0,
    updated_at: mockMessages.c2.at(-1)!.created_at,
  },
  {
    id: "c4",
    is_group: false,
    name: users.ayah.name,
    participants: [users.ayah],
    last_message: mockMessages.c4.at(-1),
    unread_count: 1,
    updated_at: mockMessages.c4.at(-1)!.created_at,
  },
];
