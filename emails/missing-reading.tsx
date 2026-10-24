import { Section, Text } from "@react-email/components";
import { EmailButton, EmailHeading, EmailLayout, colors, styles } from "./_components/layout";
import { formatDateTime, plural } from "./_components/format";

export type MissingReadingType = "meter" | "chlorine";

export interface MissingReadingEmailProps {
  appUrl: string;
  readingType: MissingReadingType;
  /** Null when no reading of this type has ever been recorded */
  lastReadingAt: string | null;
  daysSinceLastReading: number | null;
  thresholdDays: number;
}

export function missingReadingSubject({ readingType, daysSinceLastReading }: MissingReadingEmailProps): string {
  const label = readingType === "meter" ? "meter" : "chlorine";
  return daysSinceLastReading === null
    ? `No ${label} readings have been recorded`
    : `No ${label} reading in ${plural(daysSinceLastReading, "day")}`;
}

export function MissingReadingEmail(props: MissingReadingEmailProps) {
  const { appUrl, readingType, lastReadingAt, daysSinceLastReading, thresholdDays } = props;
  const label = readingType === "meter" ? "meter" : "chlorine";

  return (
    <EmailLayout
      preview={`Please record a ${label} reading.`}
      appUrl={appUrl}
      reason={`You’re getting this because you asked to be alerted after ${plural(thresholdDays, "day")} without a ${label} reading. You’ll get one alert per gap.`}
    >
      <EmailHeading eyebrow="Missing reading">{missingReadingSubject(props)}</EmailHeading>
      <Section
        style={{
          padding: "16px",
          borderRadius: "6px",
          borderLeft: `4px solid ${colors.critical}`,
          backgroundColor: colors.criticalSurface,
        }}
      >
        <Text style={{ ...styles.text, margin: 0 }}>
          {lastReadingAt && daysSinceLastReading !== null ? (
            <>
              The last {label} reading was recorded <strong>{formatDateTime(lastReadingAt)}</strong>,{" "}
              {plural(daysSinceLastReading, "day")} ago.
            </>
          ) : (
            <>There are no {label} readings in the system yet.</>
          )}
        </Text>
      </Section>
      <EmailButton href={`${appUrl}/dashboard/readings`}>Record a {label} reading</EmailButton>
    </EmailLayout>
  );
}

MissingReadingEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  readingType: "chlorine",
  lastReadingAt: "2026-10-20T13:15:00Z",
  daysSinceLastReading: 3,
  thresholdDays: 2,
} satisfies MissingReadingEmailProps;

export default MissingReadingEmail;
