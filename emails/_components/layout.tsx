import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Mirrors the app theme: zinc neutrals with the sky-blue brand accent
export const colors = {
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  surface: "#f4f4f5",
  brand: "#0284c7",
  critical: "#dc2626",
  criticalSurface: "#fef2f2",
  warning: "#d97706",
  good: "#16a34a",
};

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const styles = {
  eyebrow: {
    margin: "0 0 4px",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: colors.muted,
  },
  heading: {
    margin: "0 0 16px",
    fontSize: "20px",
    lineHeight: "28px",
    fontWeight: 600,
    color: colors.text,
  },
  sectionHeading: {
    margin: "24px 0 8px",
    fontSize: "11px",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    fontWeight: 600,
    color: colors.muted,
  },
  text: {
    margin: "0 0 12px",
    fontSize: "14px",
    lineHeight: "22px",
    color: colors.text,
  },
  meta: {
    margin: "0",
    fontSize: "12px",
    lineHeight: "18px",
    color: colors.muted,
  },
  button: {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: "6px",
    backgroundColor: colors.brand,
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
  },
} satisfies Record<string, CSSProperties>;

interface EmailLayoutProps {
  /** Inbox preview line shown after the subject */
  preview: string;
  appUrl: string;
  /** Why this person is getting the email, shown in the footer */
  reason: string;
  children: ReactNode;
}

export function EmailLayout({ preview, appUrl, reason, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: "24px 0", backgroundColor: colors.surface, fontFamily }}>
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
          }}
        >
          <Section style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}` }}>
            <Link
              href={`${appUrl}/dashboard`}
              style={{ fontSize: "13px", fontWeight: 600, color: colors.text, textDecoration: "none" }}
            >
              Richmond Fire District
            </Link>
            <Text style={{ ...styles.meta, fontSize: "11px" }}>Water System</Text>
          </Section>
          <Section style={{ padding: "24px" }}>{children}</Section>
          <Hr style={{ margin: 0, borderColor: colors.border }} />
          <Section style={{ padding: "16px 24px" }}>
            <Text style={styles.meta}>
              {reason}{" "}
              <Link href={`${appUrl}/dashboard/notifications`} style={{ color: colors.muted, textDecoration: "underline" }}>
                Manage notifications
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Heading as="h1" style={styles.heading}>
        {children}
      </Heading>
    </>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "20px 0 4px" }}>
      <Button href={href} style={styles.button}>
        {children}
      </Button>
    </Section>
  );
}
