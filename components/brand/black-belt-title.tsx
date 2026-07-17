type TitleTag = "h1" | "h2" | "p" | "span";

/**
 * Page title with black-belt tip: penultimate letter red, last letter white
 * with black outline (belt tip).
 */
export function BlackBeltTitle({
  children,
  className,
  as: Tag = "h1",
}: {
  children: string;
  className?: string;
  as?: TitleTag;
}) {
  const title = children.trim();

  if (title.length < 2) {
    return <Tag className={className}>{title}</Tag>;
  }

  const head = title.slice(0, -2);
  const penultimate = title.slice(-2, -1);
  const last = title.slice(-1);

  return (
    <Tag className={className}>
      {head}
      <span className="text-[var(--action-red)]">{penultimate}</span>
      <span
        className="inline-block text-white"
        style={{
          WebkitTextStroke: "1.35px #000",
          paintOrder: "stroke fill",
        }}
      >
        {last}
      </span>
    </Tag>
  );
}
