const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Fetch all posts, optionally filtered by category slug.
 */
export async function getPosts(categorySlug) {
  const url = categorySlug
    ? `${API_URL}/posts?category=${encodeURIComponent(categorySlug)}`
    : `${API_URL}/posts`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }

  const data = await res.json();
  return data.posts;
}

/**
 * Fetch a single post by slug.
 */
export async function getPostBySlug(slug) {
  const res = await fetch(`${API_URL}/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch post");
  }

  const data = await res.json();
  return data.post;
}

/**
 * Fetch all categories.
 */
export async function getCategories() {
  const res = await fetch(`${API_URL}/categories`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }

  const data = await res.json();
  return data.categories;
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
