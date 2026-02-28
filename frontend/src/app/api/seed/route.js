import { NextResponse } from "next/server";
import { createPost } from "@/lib/db";

export async function POST(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    title = "My First Blog Post",
    category = "Technology",
    content = "This is a test blog post created via the **seed endpoint**.\n\nIt supports *markdown* formatting!\n\n## Features\n- Telegram bot publishing\n- Cloudinary image uploads\n- Beautiful dark theme\n\n> This post was seeded for testing purposes.",
    imageUrl = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=630&fit=crop",
  } = body;

  try {
    const post = await createPost({ title, content, imageUrl, categoryName: category });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
