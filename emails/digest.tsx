import type { ReactNode } from "react";
import { Column, Link, Row, Section, Text } from "@react-email/components";
import { EmailButton, EmailHeading, EmailLayout, colors, styles } from "./_components/layout";
import { formatDate, formatDateTime, formatNumber, plural } from "./_components/format";

// Same safe range the dashboard KPI band and readings table use
const CHLORINE_MIN = 0.2;
const CHLORINE_MAX = 4.0;

export interface DigestEmailProps {
  appUrl: string;
  frequency: "daily" | "weekly";
  periodStart: string;
  periodEnd: string;
  production: {
    /** Null when there aren't enough meter readings to compute usage */
    totalGallons: number | null;
    averageDailyGallons: number | null;
  };
  readingCounts: { meter: number; chlorine: number; reservoir: number };
  chlorineReadings: Array<{ location: string; level: number; recordedAt: string }>;
  reservoirs: Array<{ name: string; levelInches: number; maxLevelInches: number | null; recordedAt: string }>;
  logPosts: Array<{ id: string; title: string; authorName: string; createdAt: string }>;
}

export function digestSubject({
  frequency,
  periodStart,
  periodEnd,
}: Pick<DigestEmailProps, "frequency" | "periodStart" | "periodEnd">): string {
  return frequency === "daily"
    ? `Daily water system digest · ${formatDate(periodEnd, { weekday: "short" })}`
    : `Weekly water system digest · ${formatDate(periodStart)} – ${formatDate(periodEnd)}`;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Column style={{ width: "50%", verticalAlign: "top", padding: "12px 16px" }}>
      <Text style={{ ...styles.eyebrow, margin: "0 0 2px" }}>{label}</Text>
      <Text style={{ margin: 0, fontSize: "20px", lineHeight: "28px", fontWeight: 600, color: colors.text }}>{value}</Text>
      {detail && <Text style={styles.meta}>{detail}</Text>}
    </Column>
  );
}

function ListRow({ left, sub, right, rightColor }: { left: string; sub?: string; right: string; rightColor?: string }) {
  return (
    <Row style={{ borderBottom: `1px solid ${colors.border}` }}>
      <Column style={{ padding: "8px 0" }}>
        <Text style={{ ...styles.text, margin: 0 }}>{left}</Text>
        {sub && <Text style={styles.meta}>{sub}</Text>}
      </Column>
      <Column style={{ padding: "8px 0", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap" }}>
        <Text style={{ ...styles.text, margin: 0, fontWeight: 600, color: rightColor ?? colors.text }}>{right}</Text>
      </Column>
    </Row>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <Text style={{ ...styles.meta, padding: "8px 0" }}>{children}</Text>;
}

function chlorineLabel(level: number): { text: string; color: string } {
  if (level < CHLORINE_MIN) return { text: `${level.toFixed(2)} ppm · Low`, color: colors.critical };
  if (level > CHLORINE_MAX) return { text: `${level.toFixed(2)} ppm · High`, color: colors.warning };
  return { text: `${level.toFixed(2)} ppm`, color: colors.text };
}

export function DigestEmail(props: DigestEmailProps) {
  const { appUrl, frequency, periodStart, periodEnd, production, readingCounts, chlorineReadings, reservoirs, logPosts } =
    props;
  const periodLabel = frequency === "daily" ? "the last 24 hours" : "the last 7 days";
  const outOfRange = chlorineReadings.filter((r) => r.level < CHLORINE_MIN || r.level > CHLORINE_MAX).length;
  const totalReadings = readingCounts.meter + readingCounts.chlorine + readingCounts.reservoir;

  return (
    <EmailLayout
      preview={[
        production.totalGallons !== null ? `${formatNumber(production.totalGallons)} gal produced` : null,
        plural(totalReadings, "reading"),
        outOfRange > 0 ? `${outOfRange} chlorine out of range` : null,
        plural(logPosts.length, "log post"),
      ]
        .filter(Boolean)
        .join(" · ")}
      appUrl={appUrl}
      reason={`You’re getting this because you turned on the ${frequency} digest.`}
    >
      <EmailHeading eyebrow={`${frequency === "daily" ? "Daily" : "Weekly"} digest`}>
        {frequency === "daily"
          ? formatDate(periodEnd, { weekday: "long", month: "long" })
          : `${formatDate(periodStart)} – ${formatDate(periodEnd)}`}
      </EmailHeading>

      <Section style={{ borderRadius: "6px", backgroundColor: colors.surface }}>
        <Row>
          <Stat
            label="Production"
            value={production.totalGallons !== null ? `${formatNumber(production.totalGallons)} gal` : "—"}
            detail={
              frequency === "weekly" && production.averageDailyGallons !== null
                ? `${formatNumber(production.averageDailyGallons)} gal/day average`
                : undefined
            }
          />
          <Stat
            label="Readings"
            value={formatNumber(totalReadings)}
            detail={`${readingCounts.meter} meter · ${readingCounts.chlorine} chlorine · ${readingCounts.reservoir} reservoir`}
          />
        </Row>
      </Section>

      <SectionTitle>Chlorine residual</SectionTitle>
      {chlorineReadings.length > 0 ? (
        <Section>
          {chlorineReadings.map((r, i) => {
            const label = chlorineLabel(r.level);
            return (
              <ListRow key={i} left={r.location} sub={formatDateTime(r.recordedAt)} right={label.text} rightColor={label.color} />
            );
          })}
        </Section>
      ) : (
        <Empty>No chlorine readings in {periodLabel}.</Empty>
      )}

      <SectionTitle>Reservoir levels</SectionTitle>
      {reservoirs.length > 0 ? (
        <Section>
          {reservoirs.map((r, i) => (
            <ListRow
              key={i}
              left={r.name}
              sub={`As of ${formatDateTime(r.recordedAt)}`}
              right={
                r.maxLevelInches
                  ? `${formatNumber(r.levelInches, 1)} in · ${Math.round((r.levelInches / r.maxLevelInches) * 100)}%`
                  : `${formatNumber(r.levelInches, 1)} in`
              }
            />
          ))}
        </Section>
      ) : (
        <Empty>No reservoir readings yet.</Empty>
      )}

      <SectionTitle>Log</SectionTitle>
      {logPosts.length > 0 ? (
        <Section>
          {logPosts.map((p) => (
            <Row key={p.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <Column style={{ padding: "8px 0" }}>
                <Link href={`${appUrl}/dashboard/log/${p.id}`} style={{ ...styles.text, margin: 0, color: colors.brand }}>
                  {p.title}
                </Link>
                <Text style={styles.meta}>
                  {p.authorName} · {formatDateTime(p.createdAt)}
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      ) : (
        <Empty>No log posts in {periodLabel}.</Empty>
      )}

      <EmailButton href={`${appUrl}/dashboard`}>Open dashboard</EmailButton>
    </EmailLayout>
  );
}

DigestEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  frequency: "weekly",
  periodStart: "2026-10-16T12:00:00Z",
  periodEnd: "2026-10-23T12:00:00Z",
  production: { totalGallons: 412_300, averageDailyGallons: 58_900 },
  readingCounts: { meter: 14, chlorine: 7, reservoir: 7 },
  chlorineReadings: [
    { location: "Pump house", level: 0.82, recordedAt: "2026-10-23T13:10:00Z" },
    { location: "End of line – Jericho Rd", level: 0.18, recordedAt: "2026-10-22T13:40:00Z" },
    { location: "Pump house", level: 0.91, recordedAt: "2026-10-21T13:05:00Z" },
  ],
  reservoirs: [{ name: "Main reservoir", levelInches: 212.5, maxLevelInches: 240, recordedAt: "2026-10-23T13:12:00Z" }],
  logPosts: [
    { id: "1", title: "Flushed hydrants on Bridge St", authorName: "Sam Tester", createdAt: "2026-10-23T14:30:00Z" },
    { id: "2", title: "Replaced pressure gauge at pump house", authorName: "Alex Example", createdAt: "2026-10-20T18:05:00Z" },
  ],
} satisfies DigestEmailProps;

export default DigestEmail;
