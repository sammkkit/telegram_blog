import Link from "next/link";
import { formatDate } from "@/lib/api";

export default function PostCard({ post }) {
  return (
    <Link href={`/post/${post.slug}`} className="post-card">
      <div className="post-card-image-wrapper">
        <img
          src={post.imageUrl}
          alt={post.title}
          className="post-card-image"
          loading="lazy"
        />
      </div>
      <div className="post-card-body">
        <div className="post-card-meta">
          <span className="post-card-category">{post.category.name}</span>
          <span className="post-card-date">{formatDate(post.createdAt)}</span>
        </div>
        <h2 className="post-card-title">{post.title}</h2>
        <p className="post-card-excerpt">{post.excerpt}</p>
      </div>
    </Link>
  );
}
