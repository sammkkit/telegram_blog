import { getPostBySlug } from "@/lib/db";
import PostContent from "@/components/PostContent";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: "Post Not Found" };
    return {
      title: `${post.title} — Canvas of Emotions`,
      description: post.excerpt,
    };
  } catch {
    return { title: "Post Not Found" };
  }
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  let post;

  try {
    post = await getPostBySlug(slug);
  } catch {
    notFound();
  }

  if (!post) {
    notFound();
  }

  return (
    <article>
      {/* Header */}
      <div className="content-container">
        <div className="article-header">
          <Link href="/" className="back-link">
            ← Back to all posts
          </Link>
          <Link
            href={`/category/${post.category.slug}`}
            className="article-category"
          >
            {post.category.name}
          </Link>
          <h1 className="article-title">{post.title}</h1>
          <p className="article-date">{formatDate(post.createdAt)}</p>
        </div>
      </div>

      {/* Hero Image */}
      <div className="article-hero">
        <img src={post.imageUrl} alt={post.title} />
      </div>

      {/* Content */}
      <PostContent content={post.content} />
    </article>
  );
}
