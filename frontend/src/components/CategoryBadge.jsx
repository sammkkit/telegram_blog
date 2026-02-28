import Link from "next/link";

export default function CategoryBadge({ category, active }) {
  return (
    <Link
      href={active ? "/" : `/category/${category.slug}`}
      className={`category-pill ${active ? "active" : ""}`}
    >
      {category.name}
      {category._count && (
        <span className="pill-count">{category._count.posts}</span>
      )}
    </Link>
  );
}
