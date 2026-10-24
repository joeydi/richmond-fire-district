import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import { Section, Text } from "@react-email/components";
import { EmailButton, EmailHeading, EmailLayout, colors, styles } from "./_components/layout";
import { formatDateTime } from "./_components/format";

export interface NewLogPostEmailProps {
  appUrl: string;
  postId: string;
  title: string;
  /** Markdown, as stored in log_posts.content */
  content: string;
  authorName: string;
  createdAt: string;
}

const block: CSSProperties = { margin: "0 0 12px", fontSize: "14px", lineHeight: "22px", color: colors.text };

export function NewLogPostEmail({ appUrl, postId, title, content, authorName, createdAt }: NewLogPostEmailProps) {
  // The title is taken from the post's first line, so a leading heading would
  // show up twice
  const body = content.trimStart().replace(/^#{1,6}\s.*(\n|$)/, "");

  return (
    <EmailLayout
      preview={`${authorName}: ${title}`}
      appUrl={appUrl}
      reason="You’re getting this because you turned on emails for new log posts."
    >
      <EmailHeading eyebrow="New log entry">{title}</EmailHeading>
      <Text style={{ ...styles.meta, marginBottom: "16px" }}>
        {authorName} · {formatDateTime(createdAt)}
      </Text>
      <Section style={{ padding: "16px", borderRadius: "6px", backgroundColor: colors.surface }}>
        {/* react-markdown escapes any raw HTML in the post, so content can't inject markup */}
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={block}>{children}</p>,
            h1: ({ children }) => <p style={{ ...block, fontWeight: 600, fontSize: "16px" }}>{children}</p>,
            h2: ({ children }) => <p style={{ ...block, fontWeight: 600, fontSize: "15px" }}>{children}</p>,
            h3: ({ children }) => <p style={{ ...block, fontWeight: 600 }}>{children}</p>,
            ul: ({ children }) => <ul style={{ ...block, paddingLeft: "20px" }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ ...block, paddingLeft: "20px" }}>{children}</ol>,
            li: ({ children }) => <li style={{ margin: "0 0 4px" }}>{children}</li>,
            blockquote: ({ children }) => (
              <blockquote
                style={{ margin: "0 0 12px", paddingLeft: "12px", borderLeft: `3px solid ${colors.border}`, color: colors.muted }}
              >
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a href={href} style={{ color: colors.brand }}>
                {children}
              </a>
            ),
            code: ({ children }) => (
              <code style={{ fontFamily: "Menlo, Consolas, monospace", fontSize: "13px" }}>{children}</code>
            ),
            // Log images live in a private bucket, so they can't render in an inbox
            img: () => null,
          }}
        >
          {body}
        </ReactMarkdown>
      </Section>
      <EmailButton href={`${appUrl}/dashboard/log/${postId}`}>View in log</EmailButton>
    </EmailLayout>
  );
}

NewLogPostEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  postId: "00000000-0000-0000-0000-000000000000",
  title: "Flushed hydrants on Bridge St",
  content:
    "## Flushed hydrants on Bridge St\n\nFlushed **H-12** through **H-15** this morning. Water ran clear after about 10 minutes at each.\n\n- H-13 cap was stiff, greased it\n- H-15 needs a new paint job\n\nChlorine at the end of the line read 0.6 ppm.",
  authorName: "Sam Tester",
  createdAt: "2026-10-23T14:30:00Z",
} satisfies NewLogPostEmailProps;

export default NewLogPostEmail;
