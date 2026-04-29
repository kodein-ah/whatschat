function doPost(e) {
  try {
    Logger.log("=== REQUEST RECEIVED ===");
    Logger.log("Event object exists: " + (e ? "YES" : "NO"));
    
    if (!e || !e.postData) {
      Logger.log("⚠️ WARNING: e or e.postData is undefined");
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "postData is undefined - check GAS deployment settings"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    let data = {};
    
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.postData) {
      try {
        data = JSON.parse(String(e.postData));
      } catch (parseErr) {
        data = e.postData;
      }
    } else {
      throw new Error("No postData received");
    }

    Logger.log("Parsed data: " + JSON.stringify(data));
    Logger.log("Request type: " + (data.type || "image_upload"));

    // ===== IMAGE UPLOAD =====
    if (!data.type || data.type === "image_upload") {
      return handleImageUpload(data);
    }

    // ===== SEND OTP EMAIL =====
    if (data.type === "send_otp_email") {
      return handleSendOTPEmail(data);
    }

    throw new Error("Unknown request type: " + data.type);

  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle Image Upload (existing logic - UNCHANGED ✅)
 */
function handleImageUpload(data) {
  try {
    Logger.log("📸 Processing image upload...");

    if (!data.base64Data) {
      throw new Error("base64Data missing");
    }

    var folderId = "1UZ3Qh21VUEsjjmjHNoXMy4av7con2on9";
    var folder = DriveApp.getFolderById(folderId);
    
    var bytes = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(bytes, data.mimeType || "image/png", data.fileName);
    var file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileId = file.getId();
    var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
    
    Logger.log("✅ File uploaded: " + directUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: directUrl,
      fileId: fileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("❌ Image upload error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle Send OTP Email (existing logic - UNCHANGED ✅)
 */
function handleSendOTPEmail(data) {
  try {
    Logger.log("📧 Sending OTP email...");

    // Validasi input
    if (!data.email) throw new Error("Email missing");
    if (!data.otp) throw new Error("OTP missing");
    if (!data.phoneNumber) throw new Error("Phone number missing");

    var recipient = data.email;
    var otpCode = data.otp;
    var phoneNumber = data.phoneNumber;
    var subject = "🔐 Kode Verifikasi NexusWhatChat";

    // HTML Email Template
    var htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f4f4f4; 
            margin: 0; 
            padding: 0; 
          }
          .container { 
            background-color: white; 
            margin: 20px auto; 
            padding: 30px; 
            max-width: 500px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          .header { 
            text-align: center; 
            color: #333; 
            margin-bottom: 30px;
          }
          .header h2 { 
            margin: 0 0 10px 0; 
            color: #0066cc; 
            font-size: 28px;
          }
          .header p { 
            margin: 0; 
            color: #666; 
            font-size: 14px; 
          }
          .content { 
            margin: 20px 0; 
            color: #333; 
            line-height: 1.6; 
            font-size: 15px;
          }
          .otp-box { 
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            border-radius: 10px; 
            padding: 25px; 
            text-align: center; 
            margin: 25px 0; 
            box-shadow: 0 4px 6px rgba(0,102,204,0.2);
          }
          .otp-code { 
            font-size: 42px; 
            font-weight: bold; 
            letter-spacing: 10px; 
            color: white; 
            font-family: 'Courier New', monospace; 
          }
          .info { 
            background-color: #e7f3ff; 
            padding: 15px; 
            border-left: 4px solid #0066cc; 
            border-radius: 4px; 
            margin: 20px 0; 
            font-size: 13px;
          }
          .warning { 
            color: #d32f2f; 
            font-weight: bold; 
          }
          .footer { 
            text-align: center; 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px; 
            border-top: 1px solid #eee; 
            padding-top: 20px; 
          }
          a { 
            color: #0066cc; 
            text-decoration: none; 
          }
          .divider { 
            height: 1px; 
            background-color: #eee; 
            margin: 20px 0; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 Kode Verifikasi</h2>
            <p>NexusWhatChat - Real-time Messaging</p>
          </div>

          <div class="content">
            <p>Halo,</p>
            <p>Terima kasih telah mendaftar di <strong>NexusWhatChat</strong>. Gunakan kode OTP di bawah untuk memverifikasi nomor HP Anda:</p>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>

            <div class="info">
              <strong>📱 Nomor HP:</strong> ${phoneNumber}<br>
              <strong>⏱️ Berlaku selama:</strong> 10 menit<br>
              <strong>🔒 Keamanan:</strong> Jangan bagikan kode ini!
            </div>

            <p><span class="warning">⚠️ Penting:</span> Kode OTP ini hanya untuk Anda. Jangan bagikan ke siapapun, termasuk tim support kami.</p>

            <div class="divider"></div>

            <p>Jika Anda tidak melakukan permintaan ini, abaikan email ini.</p>
          </div>

          <div class="footer">
            <p>&copy; 2026 NexusWhatChat. Semua hak dilindungi.</p>
            <p><a href="#">Kunjungi Website</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Kirim email via Gmail
    GmailApp.sendEmail(recipient, subject, otpCode, {
      htmlBody: htmlBody,
      name: "NexusWhatChat Security"
    });

    Logger.log("✅ OTP email sent to: " + recipient);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "OTP email sent successfully",
      email: recipient
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("❌ Email error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  // Add CORS support
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}