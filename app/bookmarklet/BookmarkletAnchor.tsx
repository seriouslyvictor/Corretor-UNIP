"use client";

// BookmarkletAnchor — Client Component so onClick (e.preventDefault) can be passed.
// The parent page (page.tsx) remains a Server Component.

interface BookmarkletAnchorProps {
  href: string;
}

export default function BookmarkletAnchor({ href }: BookmarkletAnchorProps) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      draggable={true}
      className="inline-block rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-grab active:cursor-grabbing select-none"
    >
      Corretor UNIP — Copiar HTML
    </a>
  );
}
