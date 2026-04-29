<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    /**
     * ✅ List conversations untuk current user
     * GET /api/conversations
     */
    public function listConversations(Request $request)
    {
        try {
            $userId = $request->user()->id;

            Log::info('[ChatController] Fetching conversations', [
                'user_id' => $userId,
            ]);

            // ✅ Query conversations dengan relationships
            $conversations = Conversation::forUser($userId)
                ->with([
                    'users' => function ($q) {
                        $q->select('users.id', 'users.name', 'users.email', 'users.avatar', 'users.online', 'users.status');
                    },
                    'messages' => function ($q) {
                        $q->latest()->limit(1)->with('sender:id,name,avatar');
                    }
                ])
                ->orderByDesc('updated_at')
                ->get();

            // ✅ Format response
            $formatted = $conversations->map(function ($conversation) use ($userId) {
                // Cari partner (user lain dalam conversation)
                $partner = $conversation->users->where('id', '!=', $userId)->first();
                
                // Get last message
                $lastMessage = $conversation->messages->first();

                return [
                    'id' => (string) $conversation->id,
                    'is_group' => (bool) $conversation->is_group,
                    'name' => $conversation->is_group 
                        ? ($conversation->name ?? 'Grup') 
                        : ($partner->name ?? 'User'),
                    'avatar' => $conversation->is_group 
                        ? $conversation->avatar 
                        : ($partner->avatar ?? null),
                    'participants' => $conversation->users->map(fn($u) => [
                        'id' => (string) $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'avatar' => $u->avatar,
                        'online' => (bool) $u->online,
                        'status' => $u->status,
                    ])->toArray(),
                    'last_message' => $lastMessage ? [
                        'id' => (string) $lastMessage->id,
                        'body' => $lastMessage->body,
                        'type' => $lastMessage->type,
                        'sender_id' => (string) $lastMessage->sender_id,
                        'sender' => $lastMessage->sender ? [
                            'id' => (string) $lastMessage->sender->id,
                            'name' => $lastMessage->sender->name,
                            'avatar' => $lastMessage->sender->avatar,
                        ] : null,
                        'created_at' => $lastMessage->created_at->toIso8601String(),
                        'status' => $lastMessage->status,
                    ] : null,
                    'unread_count' => $conversation->messages()
                        ->where('sender_id', '!=', $userId)
                        ->where('status', '!=', 'read')
                        ->count(),
                    'created_at' => $conversation->created_at->toIso8601String(),
                    'updated_at' => $conversation->updated_at->toIso8601String(),
                ];
            });

            Log::info('[ChatController] Conversations fetched', [
                'user_id' => $userId,
                'count' => $formatted->count(),
            ]);

            return response()->json($formatted->values()->all(), 200);

        } catch (\Exception $e) {
            Log::error('[ChatController] Error listing conversations', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat percakapan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ PERBAIKAN: Start conversation dengan user lain
     * POST /api/conversations/start
     * Body: { "user_id": 2 }
     * 
     * ⭐ PENTING: Method ini HARUS bernama startChat() sesuai dengan route
     */
    public function startChat(Request $request)
    {
        try {
            Log::info('[ChatController] startChat() method called', [
                'timestamp' => now(),
            ]);

            // ✅ Validasi input
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
            ]);

            $currentUserId = $request->user()->id;
            $targetUserId = $validated['user_id'];

            Log::info('[ChatController] Start chat validation', [
                'current_user' => $currentUserId,
                'target_user' => $targetUserId,
            ]);

            // ✅ Security: Tidak bisa chat dengan diri sendiri
            if ($currentUserId == $targetUserId) {
                Log::warning('[ChatController] User trying to chat with self', [
                    'user_id' => $currentUserId,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak bisa membuat chat dengan diri sendiri'
                ], 422);
            }

            // ✅ Cari atau buat conversation
            $currentUser = User::findOrFail($currentUserId);
            $targetUser = User::findOrFail($targetUserId);

            Log::info('[ChatController] Users found', [
                'current_user' => $currentUser->name,
                'target_user' => $targetUser->name,
            ]);

            $conversation = $currentUser->getOrCreateConversationWith($targetUser);

            Log::info('[ChatController] Conversation created/found', [
                'conversation_id' => $conversation->id,
            ]);

            // ✅ Load dengan relationships
            $conversation->load([
                'users:id,name,email,avatar,online,status',
                'messages' => function ($q) {
                    $q->latest()->limit(50)->with('sender:id,name,avatar');
                }
            ]);

            // ✅ Format response
            $response = [
                'id' => (string) $conversation->id,
                'is_group' => (bool) $conversation->is_group,
                'name' => $targetUser->name ?? 'Chat',
                'avatar' => $targetUser->avatar,
                'participants' => $conversation->users->map(fn($u) => [
                    'id' => (string) $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar' => $u->avatar,
                    'online' => (bool) $u->online,
                    'status' => $u->status,
                ])->toArray(),
                'messages' => $conversation->messages->reverse()->map(function ($msg) {
                    return [
                        'id' => (string) $msg->id,
                        'body' => $msg->body,
                        'type' => $msg->type,
                        'sender_id' => (string) $msg->sender_id,
                        'sender' => $msg->sender ? [
                            'id' => (string) $msg->sender->id,
                            'name' => $msg->sender->name,
                            'avatar' => $msg->sender->avatar,
                        ] : null,
                        'attachment' => $msg->attachment,
                        'status' => $msg->status,
                        'created_at' => $msg->created_at->toIso8601String(),
                    ];
                })->values()->toArray(),
                'created_at' => $conversation->created_at->toIso8601String(),
                'updated_at' => $conversation->updated_at->toIso8601String(),
            ];

            Log::info('[ChatController] Returning conversation response', [
                'conversation_id' => $conversation->id,
            ]);

            return response()->json($response, 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[ChatController] Validation error', [
                'errors' => $e->errors(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('[ChatController] Error starting conversation', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat percakapan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Get messages dari conversation
     * GET /api/conversations/{id}/messages
     */
    public function index($conversationId)
    {
        try {
            $userId = auth()->id();

            // ✅ Cek apakah user ada di conversation
            $conversation = Conversation::findOrFail($conversationId);

            $isMember = $conversation->users()
                                    ->where('users.id', $userId)
                                    ->exists();

            if (!$isMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses ke percakapan ini',
                ], 403);
            }

            // ✅ Get messages
            $messages = Message::where('conversation_id', $conversationId)
                               ->with('sender:id,name,avatar')
                               ->orderBy('created_at', 'asc')
                               ->get()
                               ->map(function ($msg) {
                                   return [
                                       'id' => (string) $msg->id,
                                       'body' => $msg->body,
                                       'type' => $msg->type,
                                       'sender_id' => (string) $msg->sender_id,
                                       'sender' => $msg->sender ? [
                                           'id' => (string) $msg->sender->id,
                                           'name' => $msg->sender->name,
                                           'avatar' => $msg->sender->avatar,
                                       ] : null,
                                       'attachment' => $msg->attachment,
                                       'status' => $msg->status,
                                       'created_at' => $msg->created_at->toIso8601String(),
                                   ];
                               });

            return response()->json($messages->values()->all(), 200);

        } catch (\Exception $e) {
            Log::error('[ChatController] Error getting messages', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat pesan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Send message
     * POST /api/conversations/{id}/messages
     * Body: { "type": "text", "body": "Halo!" }
     */
    public function store(Request $request, $conversationId)
    {
        try {
            // ✅ Validasi
            $validated = $request->validate([
                'type' => 'required|in:text,image,file,voice',
                'body' => 'nullable|string|max:5000',
                'attachment_url' => 'nullable|string',
                'attachment_name' => 'nullable|string',
                'attachment_size' => 'nullable|integer',
                'attachment_mime' => 'nullable|string',
            ]);

            $userId = auth()->id();

            // ✅ Cek user ada di conversation
            $conversation = Conversation::findOrFail($conversationId);

            $isMember = $conversation->users()
                                    ->where('users.id', $userId)
                                    ->exists();

            if (!$isMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses',
                ], 403);
            }

            // ✅ Create message
            $message = Message::create([
                'conversation_id' => $conversationId,
                'sender_id' => $userId,
                'type' => $validated['type'],
                'body' => $validated['body'] ?? '',
                'attachment_url' => $validated['attachment_url'] ?? null,
                'attachment_name' => $validated['attachment_name'] ?? null,
                'attachment_size' => $validated['attachment_size'] ?? null,
                'attachment_mime' => $validated['attachment_mime'] ?? null,
                'status' => 'sent',
            ]);

            // ✅ Update conversation timestamp
            $conversation->touch();

            // ✅ Load sender info
            $message->load('sender:id,name,avatar');

            // ✅ Format response
            return response()->json([
                'id' => (string) $message->id,
                'body' => $message->body,
                'type' => $message->type,
                'sender_id' => (string) $message->sender_id,
                'sender' => $message->sender ? [
                    'id' => (string) $message->sender->id,
                    'name' => $message->sender->name,
                    'avatar' => $message->sender->avatar,
                ] : null,
                'attachment' => $message->attachment,
                'status' => $message->status,
                'created_at' => $message->created_at->toIso8601String(),
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('[ChatController] Error sending message', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim pesan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ Mark message as read
     * POST /api/conversations/{id}/read
     */
    public function markRead(Request $request, $conversationId)
    {
        try {
            $userId = $request->user()->id;

            Message::where('conversation_id', $conversationId)
                   ->where('sender_id', '!=', $userId)
                   ->where('status', '!=', 'read')
                   ->update(['status' => 'read']);

            return response()->json([
                'success' => true,
                'message' => 'Pesan ditandai sebagai sudah dibaca',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal update status',
            ], 500);
        }
    }

    /**
     * ✅ Mark message as delivered
     * POST /api/conversations/{id}/delivered
     */
    public function markDelivered(Request $request, $conversationId)
    {
        try {
            Message::where('conversation_id', $conversationId)
                   ->update(['status' => 'delivered']);

            return response()->json([
                'success' => true,
                'message' => 'Pesan ditandai sebagai terkirim',
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal update status',
            ], 500);
        }
    }
}