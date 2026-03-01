import { NextResponse } from "next/server";
import {
  createPost,
  deletePost,
  getRecentPosts,
  getBotState,
  setBotState,
  clearBotState,
} from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

const TELEGRAM_API = "https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = process.env.ALLOWED_TELEGRAM_USER_ID;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// ─── TELEGRAM HELPERS ───────────────────────────

async function sendReply(chatId, text, extra = {}) {
  try {
    await fetch(TELEGRAM_API + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        ...extra,
      }),
    });
  } catch (e) {
    console.error("Failed to send reply:", e.message);
  }
}

async function answerCallback(callbackQueryId, text) {
  try {
    await fetch(TELEGRAM_API + "/answerCallbackQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: true,
      }),
    });
  } catch (e) {
    console.error("Failed to answer callback:", e.message);
  }
}

async function getFileUrl(fileId) {
  const res = await fetch(TELEGRAM_API + "/getFile?file_id=" + fileId);
  const data = await res.json();
  if (!data.ok) throw new Error("Failed to get file from Telegram.");
  return "https://api.telegram.org/file/bot" + process.env.TELEGRAM_BOT_TOKEN + "/" + data.result.file_path;
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

// ─── COMMAND HANDLERS ───────────────────────────

async function handleStart(chatId) {
  await sendReply(
    chatId,
    "👋 *Welcome to Canvas of Emotions!*\n\nI'm your publishing assistant. Send me photos with stories, and I'll turn them into beautiful blog posts.\n\nUse /help to see all commands."
  );
}

async function handleHelp(chatId) {
  await sendReply(
    chatId,
    "📖 *Available Commands*\n\n" +
    "/create — Start creating a new post (guided)\n" +
    "/list — View your recent posts\n" +
    "/delete — Delete a post by slug\n" +
    "/cancel — Cancel the current operation\n" +
    "/help — Show this message\n\n" +
    "*Quick publish:* Send a photo with this caption format:\n\n" +
    "Title: Your Title\n" +
    "Category: Your Category\n" +
    "---\n" +
    "Your content here..."
  );
}

async function handleCreate(chatId) {
  // Clear any stale state first
  await clearBotState(chatId);
  await setBotState(chatId, { step: "title" });
  await sendReply(chatId, "📝 *Let's create a new post!*\n\nWhat's the *title*?");
}

async function handleCancel(chatId) {
  await clearBotState(chatId);
  await sendReply(chatId, "✅ Operation cancelled.");
}

async function handleList(chatId) {
  const posts = await getRecentPosts(10);

  if (posts.length === 0) {
    await sendReply(chatId, "📭 *No posts yet.*\n\nUse /create to write your first post!");
    return;
  }

  let text = "📚 *Recent Posts* (" + posts.length + ")\n\n";
  posts.forEach((p, i) => {
    text += (i + 1) + ". *" + p.title + "*\n   📂 " + p.category.name + " · 🔗 " + p.slug + "\n\n";
  });
  text += "To delete a post, tap the ✕ button below.";

  // Build inline keyboard with delete buttons
  const keyboard = posts.map((p) => [
    {
      text: "✕ " + (p.title.length > 25 ? p.title.substring(0, 25) + "..." : p.title),
      callback_data: "delete:" + p.slug,
    },
  ]);

  await sendReply(chatId, text, {
    reply_markup: JSON.stringify({ inline_keyboard: keyboard }),
  });
}

async function handleDelete(chatId, slug) {
  if (!slug) {
    await sendReply(
      chatId,
      "❌ Please provide a slug.\n\nUsage: /delete your-post-slug\n\nUse /list to see your posts and their slugs."
    );
    return;
  }

  try {
    const post = await deletePost(slug.trim());
    await sendReply(chatId, "🗑️ *Deleted:* " + post.title);
  } catch {
    await sendReply(chatId, "❌ Post not found: " + slug);
  }
}

// ─── CONVERSATION FLOW ──────────────────────────

async function handleConversation(chatId, message, state) {
  const text = message.text?.trim();

  switch (state.step) {
    case "title": {
      if (!text) {
        await sendReply(chatId, "❌ Please send a text *title*, not a photo or file.");
        return;
      }
      await setBotState(chatId, { step: "category", title: text });
      await sendReply(
        chatId,
        "✅ Title: *" + text + "*\n\n📂 Now, what *category*?\n(e.g., Poetry, Life, Art, Thoughts)"
      );
      break;
    }

    case "category": {
      if (!text) {
        await sendReply(chatId, "❌ Please send a text *category*.");
        return;
      }
      await setBotState(chatId, { step: "content", category: text });
      await sendReply(
        chatId,
        "✅ Category: *" + text + "*\n\n📄 Now write the *content*.\n(Markdown supported: bold, italic, etc.)"
      );
      break;
    }

    case "content": {
      if (!text) {
        await sendReply(chatId, "❌ Please send the *content* as text.");
        return;
      }
      await setBotState(chatId, { step: "photo", content: text });
      await sendReply(chatId, "✅ Content saved!\n\n📸 Last step — send a *photo* for this post.");
      break;
    }

    case "photo": {
      if (!message.photo || message.photo.length === 0) {
        await sendReply(chatId, "❌ Please send a *photo* (not a file or text).");
        return;
      }

      await sendReply(chatId, "⏳ Uploading image and creating your post...");

      // Upload image
      const photo = message.photo[message.photo.length - 1];
      const fileUrl = await getFileUrl(photo.file_id);
      const imageUrl = await uploadImage(fileUrl);

      // Create the post
      const post = await createPost({
        title: state.title,
        content: state.content,
        imageUrl,
        categoryName: state.category,
      });

      // Clear state
      await clearBotState(chatId);

      await sendReply(
        chatId,
        "✅ *Published!*\n\n📝 *" + post.title + "*\n📂 " + post.category.name + "\n🔗 " + post.slug + "\n\nUse /create to write another post!"
      );
      break;
    }

    default:
      await clearBotState(chatId);
      await sendReply(chatId, "Something went wrong. Use /create to start over.");
  }
}

// ─── QUICK PUBLISH (Photo + Caption) ────────────

function parseCaption(caption) {
  if (!caption) return null;

  const sepIndex = caption.indexOf("---");
  if (sepIndex === -1) return null;

  const meta = caption.substring(0, sepIndex).trim();
  const content = caption.substring(sepIndex + 3).trim();
  if (!content) return null;

  let title = "",
    category = "";
  for (const line of meta.split("\n")) {
    const l = line.trim();
    if (l.toLowerCase().startsWith("title:")) title = l.substring(6).trim();
    else if (l.toLowerCase().startsWith("category:"))
      category = l.substring(9).trim();
  }

  if (!title || !category) return null;
  return { title, category, content };
}

async function handleQuickPublish(chatId, message) {
  const parsed = parseCaption(message.caption || "");

  if (!parsed) {
    // Photo without proper caption — check for active bot state
    const state = await getBotState(chatId);
    if (state && state.step === "photo") {
      await handleConversation(chatId, message, state);
      return;
    }

    await sendReply(
      chatId,
      "📸 Got your photo! But I need a caption.\n\nEither:\n• Use /create for a guided flow\n• Or add a caption with this format:\n\nTitle: Your Title\nCategory: Your Category\n---\nYour content..."
    );
    return;
  }

  await sendReply(chatId, "⏳ Publishing your post...");

  const photo = message.photo[message.photo.length - 1];
  const fileUrl = await getFileUrl(photo.file_id);
  const imageUrl = await uploadImage(fileUrl);

  const post = await createPost({
    title: parsed.title,
    content: parsed.content,
    imageUrl,
    categoryName: parsed.category,
  });

  await sendReply(
    chatId,
    "✅ *Published!*\n\n📝 *" + post.title + "*\n📂 " + post.category.name + "\n🔗 " + post.slug
  );
}

// ─── CALLBACK QUERY HANDLER ─────────────────────

async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = String(callbackQuery.from.id);
  const data = callbackQuery.data;

  if (userId !== ALLOWED_USER_ID) {
    await answerCallback(callbackQuery.id, "⛔ Unauthorized");
    return;
  }

  if (data.startsWith("delete:")) {
    const slug = data.substring(7);
    try {
      const post = await deletePost(slug);
      await answerCallback(callbackQuery.id, "🗑️ Deleted: " + post.title);
      // Refresh the list
      await handleList(chatId);
    } catch {
      await answerCallback(callbackQuery.id, "❌ Post not found");
    }
  }
}

// ─── MAIN WEBHOOK HANDLER ───────────────────────

export async function POST(request) {
  // Verify webhook secret
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Handle callback queries (inline button presses)
  if (body.callback_query) {
    await handleCallback(body.callback_query);
    return NextResponse.json({ ok: true });
  }

  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const userId = String(message.from?.id);

  // Check allowed user
  if (userId !== ALLOWED_USER_ID) {
    await sendReply(chatId, "⛔ *Unauthorized.*\n\nYou don't have permission to use this bot.");
    return NextResponse.json({ ok: true });
  }

  const text = message.text?.trim() || "";

  try {
    // ── Command routing ──
    if (text.startsWith("/")) {
      const [cmd, ...args] = text.split(" ");
      const command = cmd.toLowerCase();

      switch (command) {
        case "/start":
          await clearBotState(chatId);
          await handleStart(chatId);
          break;
        case "/help":
        case "/commands":
          await handleHelp(chatId);
          break;
        case "/create":
          await handleCreate(chatId);
          break;
        case "/cancel":
          await handleCancel(chatId);
          break;
        case "/list":
          await handleList(chatId);
          break;
        case "/delete":
          await handleDelete(chatId, args.join(" "));
          break;
        default:
          await sendReply(chatId, "❓ Unknown command: " + cmd + "\n\nUse /help to see available commands.");
      }
      return NextResponse.json({ ok: true });
    }

    // ── Photo with caption (quick publish) ──
    if (message.photo && message.photo.length > 0) {
      await handleQuickPublish(chatId, message);
      return NextResponse.json({ ok: true });
    }

    // ── Check for active conversation ──
    const state = await getBotState(chatId);
    if (state) {
      await handleConversation(chatId, message, state);
      return NextResponse.json({ ok: true });
    }

    // ── Unrecognized message ──
    await sendReply(
      chatId,
      "💡 Use /create to start a new post, or send a photo with a caption to quick-publish.\n\nType /help for all commands."
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    await sendReply(chatId, "❌ Something went wrong. Please try again.\n\nUse /cancel to reset.");
    return NextResponse.json({ ok: true });
  }
}
