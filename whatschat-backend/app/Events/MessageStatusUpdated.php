<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $conversationId;
    public $status;

    public function __construct($conversationId, $status)
    {
        $this->conversationId = $conversationId;
        $this->status = $status;
    }

    public function broadcastOn(): array
    {
        // Teriak ke channel ruangan chat
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    public function broadcastAs(): string
    {
        // Nama event yang didengerin sama Echo
        return 'MessageStatusUpdated';
    }
}