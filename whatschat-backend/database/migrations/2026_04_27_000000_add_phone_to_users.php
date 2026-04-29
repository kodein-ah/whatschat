<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // ✅ Add phone_number jika belum ada
            if (!Schema::hasColumn('users', 'phone_number')) {
                $table->string('phone_number', 15)->unique()->nullable()->after('email');
            }
            
            // ✅ Add status jika belum ada
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('Halo, saya pakai WhatChat!')->after('phone_number');
            }
            
            // ✅ Add online jika belum ada
            if (!Schema::hasColumn('users', 'online')) {
                $table->boolean('online')->default(false)->after('status');
            }
            
            // ✅ Add last_seen_at jika belum ada
            if (!Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('online');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'phone_number')) {
                $table->dropColumn('phone_number');
            }
            if (Schema::hasColumn('users', 'status')) {
                $table->dropColumn('status');
            }
            if (Schema::hasColumn('users', 'online')) {
                $table->dropColumn('online');
            }
            if (Schema::hasColumn('users', 'last_seen_at')) {
                $table->dropColumn('last_seen_at');
            }
        });
    }
};