<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('type')->default('text');
            $table->text('body')->nullable();
            $table->string('attachment_url')->nullable();
            // WAJIB ADA INI UNTUK FITUR CENTANG
            $table->string('status')->default('sent'); 
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('messages'); }
};