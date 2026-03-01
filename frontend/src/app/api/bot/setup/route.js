import { NextResponse } from "next/server";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * GET /api/bot/setup
 * Registers bot commands with Telegram so they appear in the command menu.
 * Call this once after deploying.
 */
export async function GET() {
  const commands = [
    { command: "create", description: "📝 Create a new blog post (guided)" },
    { command: "list", description: "📚 View recent posts" },
    { command: "delete", description: "🗑️ Delete a post by slug" },
    { command: "cancel", description: "❌ Cancel current operation" },
    { command: "help", description: "📖 Show all commands" },
  ];

  const res = await fetch(`${TELEGRAM_API}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
