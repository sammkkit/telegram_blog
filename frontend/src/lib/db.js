import prisma from "./prisma";
import slugifyLib from "slugify";

function createSlug(text) {
  const base = slugifyLib(text, { lower: true, strict: true, trim: true });
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

// ─── POST OPERATIONS ────────────────────────────

/**
 * Create a new blog post. Upserts the category if it doesn't exist.
 */
export async function createPost({ title, content, imageUrl, categoryName }) {
  const categorySlug = slugifyLib(categoryName, { lower: true, strict: true });

  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: { name: categoryName, slug: categorySlug },
  });

  const excerpt =
    content.length > 160 ? content.substring(0, 160).trim() + "..." : content;

  return prisma.post.create({
    data: {
      title,
      slug: createSlug(title),
      content,
      excerpt,
      imageUrl,
      categoryId: category.id,
    },
    include: { category: true },
  });
}

/**
 * Delete a post by slug.
 */
export async function deletePost(slug) {
  return prisma.post.delete({ where: { slug } });
}

/**
 * Get recent posts (for /list command).
 */
export async function getRecentPosts(limit = 10) {
  return prisma.post.findMany({
    take: limit,
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all posts, optionally filtered by category slug.
 */
export async function getAllPosts(categorySlug) {
  const where = { published: true };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  return prisma.post.findMany({
    where,
    include: {
      category: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single post by slug.
 */
export async function getPostBySlug(slug) {
  return prisma.post.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
    },
  });
}

/**
 * Get all categories with post count.
 */
export async function getAllCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
}

// ─── BOT STATE OPERATIONS ───────────────────────

/**
 * Get the current bot conversation state for a chat.
 */
export async function getBotState(chatId) {
  return prisma.botState.findUnique({ where: { chatId: String(chatId) } });
}

/**
 * Set/update the bot conversation state.
 */
export async function setBotState(chatId, data) {
  return prisma.botState.upsert({
    where: { chatId: String(chatId) },
    update: data,
    create: { chatId: String(chatId), ...data },
  });
}

/**
 * Clear the bot conversation state (after post is created or cancelled).
 */
export async function clearBotState(chatId) {
  try {
    await prisma.botState.delete({ where: { chatId: String(chatId) } });
  } catch {
    // State might not exist, that's fine
  }
}
