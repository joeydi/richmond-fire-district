"use client";

import ReactMarkdown from "react-markdown";

interface LogPostContentProps {
  content: string;
}

export function LogPostContent({ content }: LogPostContentProps) {
  return (
    <div className="prose prose-slate max-w-none">
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
