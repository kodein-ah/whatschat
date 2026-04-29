<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use Illuminate\Http\Request;

class StoreMessageController extends Controller
{
    public function __invoke(Request $request, Conversation $conversation)
    {
        // ✅ Cek user adalah participant conversation
        if (!$conversation->participants()->where('user_id', auth()->id())->exists()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // ✅ Validasi request sesuai dengan 4 kolom attachment terpisah
        $validated = $request->validate([
            'body' => 'nullable|string|max:5000',
            'type' => 'required|string|in:text,image,file',
            'attachment_url' => 'nullable|string',
            'attachment_name' => 'nullable|string',
            'attachment_size' => 'nullable|integer',
            'attachment_mime' => 'nullable|string',
        ]);

        // ✅ Jika ada attachment, pastikan semua field terisi
        if ($validated['attachment_url'] && (!$validated['attachment_name'] || !$validated['attachment_mime'])) {
            return response()->json([
                'message' => 'Attachment name and mime are required when attachment_url is provided'
            ], 422);
        }

        // ✅ Simpan message ke database
        $message = $conversation->messages()->create([
            'sender_id' => auth()->id(),
            'body' => $validated['body'] ?? '',
            'type' => $validated['type'],
            'attachment_url' => $validated['attachment_url'] ?? null,
            'attachment_name' => $validated['attachment_name'] ?? null,
            'attachment_size' => $validated['attachment_size'] ?? null,
            'attachment_mime' => $validated['attachment_mime'] ?? null,
            'status' => 'sent',
        ]);

        $message->load('sender');

        // ✅ Broadcast ke semua user di conversation
        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message, 201);
    }
}
