<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Conversation;
use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller 
{
    /**
     * Tampilkan daftar percakapan user yang sedang login
     */
    public function listConversations(Request $request) 
    {
        $userId = $request->user()->id;

        $conversations = $request->user()->conversations()
            ->with(['users', 'messages' => function ($query) {
                $query->latest()->take(1);
            }])
            ->get()
            ->map(function ($conversation) use ($userId) {
                // Cari siapa lawan bicaranya
                $partner = $conversation->users->where('id', '!=', $userId)->first();
                
                return [
                    'id' => (string) $conversation->id,
                    'is_group' => (bool) $conversation->is_group,
                    'name' => $conversation->is_group ? ($conversation->name ?? 'Grup') : ($partner->name ?? 'User'),
                    'avatar' => $conversation->is_group ? $conversation->avatar : ($partner->avatar ?? null),
                    'participants' => $conversation->users->map(function ($user) {
                        return [
                            'id' => (string) $user->id,
                            'name' => $user->name,
                            'avatar' => $user->avatar,
                            'online' => true, // Placeholder online status
                        ];
                    })->toArray(),
                    'last_message' => $conversation->messages->first() ? [
                        'id' => (string) $conversation->messages->first()->id,
                        'body' => $conversation->messages->first()->body,
                        'sender_id' => (string) $conversation->messages->first()->sender_id,
                        'created_at' => $conversation->messages->first()->created_at->toISOString(),
                        'status' => $conversation->messages->first()->status,
                    ] : null,
                    'unread_count' => $conversation->messages()
                                        ->where('sender_id', '!=', $userId)
                                        ->where('status', '!=', 'read')
                                        ->count(),
                    'updated_at' => $conversation->updated_at->toISOString(),
                ];
            });

        return response()->json($conversations->values()->all());
    }

    /**
     * Mulai percakapan baru (Cari atau Buat)
     */
    public function startChat(Request $request) 
    {
        $data = $request->validate(['user_id' => 'required|exists:users,id']);
        $currentUserId = $request->user()->id;
        $targetUserId = $data['user_id'];

        $conversation = Conversation::where('is_group', false)
            ->whereHas('users', fn($q) => $q->where('user_id', $currentUserId))
            ->whereHas('users', fn($q) => $q->where('user_id', $targetUserId))
            ->with('users')->first();

        if (!$conversation) {
            $conversation = Conversation::create(['is_group' => false, 'name' => null]);
            $conversation->users()->attach([$currentUserId, $targetUserId]);
            $conversation->load('users');
        }

        $partner = $conversation->users->where('id', '!=', $currentUserId)->first();

        return response()->json([
            'id' => (string) $conversation->id,
            'is_group' => (bool) $conversation->is_group,
            'name' => $partner->name ?? 'Chat',
            'avatar' => $partner->avatar,
            'participants' => $conversation->users->map(fn($u) => [
                'id' => (string)$u->id, 'name' => $u->name, 'avatar' => $u->avatar, 'online' => true
            ])->toArray(),
            'last_message' => null,
            'unread_count' => 0,
            'updated_at' => $conversation->updated_at->toISOString(),
        ]);
    }

    /**
     * Ambil riwayat pesan dalam satu percakapan
     */
    public function index($conversationId) 
    {
        $messages = Message::where('conversation_id', $conversationId)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function($msg) {
                return [
                    'id' => (string) $msg->id,
                    'conversation_id' => (string) $msg->conversation_id,
                    'sender_id' => (string) $msg->sender_id,
                    'type' => $msg->type ?? 'text',
                    'body' => $msg->body ?? '',
                    'attachment_url' => $msg->attachment_url,
                    'created_at' => $msg->created_at->toISOString(),
                    'status' => $msg->status
                ];
            });
            
        return response()->json($messages->values()->all());
    }

    /**
     * Simpan pesan baru (Teks & File)
     */
    public function store(Request $request, $conversationId) 
    {
        $data = $request->validate([
            'type' => 'required|in:text,image,file',
            'body' => 'nullable|string',
            'attachment' => 'nullable|file|max:20480',
        ]);

        $payload = [
            'conversation_id' => $conversationId,
            'sender_id' => $request->user()->id,
            'body' => $data['body'] ?? '',
            'type' => $data['type'],
            'status' => 'sent'
        ];

        // LOGIKA UPLOAD FILE (BALIK LAGI!)
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('attachments', 'public');
            $payload['attachment_url'] = Storage::url($path);
        }

        $message = Message::create($payload);

        $formattedMessage = [
            'id' => (string) $message->id,
            'conversation_id' => (string) $message->conversation_id,
            'sender_id' => (string) $message->sender_id,
            'type' => $message->type,
            'body' => $message->body ?? '',
            'attachment_url' => $message->attachment_url,
            'created_at' => $message->created_at->toISOString(),
            'status' => 'sent'
        ];

        // Broadcast Real-time
        broadcast(new MessageSent((object)$formattedMessage))->toOthers();

        return response()->json($formattedMessage, 201);
    }

    /**
     * Tandai pesan sebagai telah dibaca (Centang Biru)
     */
    public function markRead(Request $request, $conversationId) 
    {
        $userId = $request->user()->id;
        Message::where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $userId)
            ->where('status', '!=', 'read')
            ->update(['status' => 'read']);

        broadcast(new MessageStatusUpdated($conversationId, 'read'))->toOthers();
        return response()->json(['success' => true]);
    }

    /**
     * Tandai pesan sebagai telah terkirim (Centang 2 Abu)
     */
    public function markDelivered(Request $request, $conversationId) 
    {
        $userId = $request->user()->id;
        Message::where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $userId)
            ->where('status', 'sent')
            ->update(['status' => 'delivered']);

        broadcast(new MessageStatusUpdated($conversationId, 'delivered'))->toOthers();
        return response()->json(['success' => true]);
    }
}