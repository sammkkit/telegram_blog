import { getAllPosts, getAllCategories } from "@/lib/db";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export const revalidate = 60;

export default async function HomePage() {
  let posts = [];
  let categories = [];
  let error = null;

  try {
    [posts, categories] = await Promise.all([getAllPosts(), getAllCategories()]);
  } catch (err) {
    error = err.message;
  }

  return (
    <>
      <section className="container">
        {/* Hero Title */}
        <div className="hero">
          <h1 className="hero-title">Canvas of Emotions</h1>
          <div className="hero-line"></div>
          <p className="hero-subtitle">
            Where feelings find their words
          </p>
        </div>

        {/* Category Orbit */}
        {categories.length > 0 && (
          <div className="category-orbit" id="categories">
            <Link href="/" className="orbit-item active">
              <span className="orbit-dot"></span>
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="orbit-item"
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
            <p className="empty-state-text">
              Could not load posts. Make sure the backend is running.
            </p>
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
            <div className="empty-state-icon">✍️</div>
            <p className="empty-state-title">No posts yet</p>
            <p className="empty-state-text">
              The canvas awaits its first strokes.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
