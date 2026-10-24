import { Text } from "@react-email/components";
import { EmailButton, EmailHeading, EmailLayout, styles } from "./_components/layout";

export interface TestEmailProps {
  appUrl: string;
  recipientName: string | null;
}

export function TestEmail({ appUrl, recipientName }: TestEmailProps) {
  return (
    <EmailLayout
      preview="Email notifications are working."
      appUrl={appUrl}
      reason="You’re getting this because you asked for a test email from your notification settings."
    >
      <EmailHeading eyebrow="Test email">Notifications are working</EmailHeading>
      <Text style={styles.text}>
        {recipientName ? `Hi ${recipientName}, this` : "This"} is a test from the Richmond Fire District water system. If
        it landed in spam, mark it as “not spam” so real alerts reach your inbox.
      </Text>
      <EmailButton href={`${appUrl}/dashboard/notifications`}>Review notification settings</EmailButton>
    </EmailLayout>
  );
}

TestEmail.PreviewProps = {
  appUrl: "http://localhost:3000",
  recipientName: "Sam",
} satisfies TestEmailProps;

export default TestEmail;
