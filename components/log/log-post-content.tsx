"use client";

import ReactMarkdown from "react-markdown";

interface LogPostContentProps {
  content: string;
}

export function LogPostContent({ content }: LogPostContentProps) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none text-sm leading-relaxed text-foreground prose-p:my-0 [&_p+p]:mt-3 prose-blockquote:font-normal prose-strong:font-semibold prose-strong:text-foreground">
      <ReactMarkdown
        components={{
          // Ensure links open in new tab for external links
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                {...(isExternal && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
