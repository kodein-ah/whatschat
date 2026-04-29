<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct($message)
    {
        // ✅ PERBAIKAN: Handle model object (tidak hanya array)
        // Message model akan otomatis convert ke array via SerializesModels
        $this->message = $message;
    }

    public function broadcastOn(): Channel
    {
        // ✅ PERBAIKAN: Get conversation_id dari message (works with object atau array)
        $conversationId = $this->message['conversation_id'] ?? $this->message->conversation_id;
        
        return new PrivateChannel('conversation.' . $conversationId);
    }
}
