import { NextResponse } from "next/server";
import { createPost } from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const ALLOWED_USER_ID = process.env.ALLOWED_TELEGRAM_USER_ID;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Parse a Telegram caption into structured blog data.
 */
function parseCaption(caption) {
  if (!caption) throw new Error("Caption is required.");

  const sepIndex = caption.indexOf("---");
  if (sepIndex === -1)
    throw new Error("Use --- to separate metadata from content.");

  const meta = caption.substring(0, sepIndex).trim();
  const content = caption.substring(sepIndex + 3).trim();
  if (!content) throw new Error("Content cannot be empty.");

  let title = "",
    category = "";
  for (const line of meta.split("\n")) {
    const l = line.trim();
    if (l.toLowerCase().startsWith("title:")) title = l.substring(6).trim();
    else if (l.toLowerCase().startsWith("category:"))
      category = l.substring(9).trim();
  }

  if (!title) throw new Error("Title is required.");
  if (!category) throw new Error("Category is required.");

  return { title, category, content };
}

async function getFileUrl(fileId) {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) throw new Error("Failed to get file from Telegram.");
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
}

async function sendReply(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (e) {
    console.error("Failed to send reply:", e.message);
  }
}

async function uploadImage(imageUrl) {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: "blog-images",
    transformation: [
      { width: 1200, height: 630, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
  return result.secure_url;
}

export async function POST(request) {
  // Verify webhook secret
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const userId = String(message.from?.id);

  // Check allowed user
  if (userId !== ALLOWED_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Must have a photo
    if (!message.photo || message.photo.length === 0) {
      await sendReply(chatId, "❌ Please send a *photo* with a caption.");
      return NextResponse.json({ ok: true });
    }

    // Parse caption
    let parsed;
    try {
      parsed = parseCaption(message.caption || "");
    } catch (err) {
      await sendReply(chatId, `❌ ${err.message}`);
      return NextResponse.json({ ok: true });
    }

    // Get highest resolution photo & upload
    const photo = message.photo[message.photo.length - 1];
    const fileUrl = await getFileUrl(photo.file_id);
    const imageUrl = await uploadImage(fileUrl);

    // Create post
    const post = await createPost({
      title: parsed.title,
      content: parsed.content,
      imageUrl,
      categoryName: parsed.category,
    });

    await sendReply(
      chatId,
      `✅ *Published!*\n\n📝 *${post.title}*\n📂 ${post.category.name}\n🔗 \`${post.slug}\``
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    await sendReply(chatId, "❌ Something went wrong. Please try again.");
    return NextResponse.json({ ok: true });
  }
}
