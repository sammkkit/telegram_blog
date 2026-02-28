import { getAllPosts, getAllCategories } from "@/lib/db";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return {
    title: `${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")} — Canvas of Emotions`,
    description: `Browse posts in the ${slug} category.`,
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  let posts = [];
  let categories = [];
  let error = null;

  try {
    [posts, categories] = await Promise.all([
      getAllPosts(slug),
      getAllCategories(),
    ]);
  } catch (err) {
    error = err.message;
  }

  // Find current category name
  const currentCategory = categories.find((c) => c.slug === slug);
  const categoryName = currentCategory
    ? currentCategory.name
    : slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

  return (
    <section className="container">
      <div className="page-header">
        <Link href="/" className="back-link">
          ← All posts
        </Link>
        <h1 className="page-title">{categoryName}</h1>
        <p className="page-subtitle">
          {posts.length} post{posts.length !== 1 ? "s" : ""} in this category
        </p>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="category-orbit">
          <Link href="/" className="orbit-item">
            <span className="orbit-dot"></span>
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className={`orbit-item${cat.slug === slug ? " active" : ""}`}
            >
              <span className="orbit-dot"></span>
              {cat.name}
              {cat._count && (
                <span className="orbit-count">{cat._count.posts}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-title">Something went wrong</p>
          <p className="empty-state-text">Could not load posts.</p>
        </div>
      )}

      {/* Post Grid */}
      {!error && posts.length > 0 && (
        <div className="posts-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!error && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <p className="empty-state-title">No posts in this category</p>
          <p className="empty-state-text">
            <Link href="/" style={{ textDecoration: "underline" }}>
              Browse all posts
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
