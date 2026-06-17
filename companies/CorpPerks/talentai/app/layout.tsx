import './globals.css';

export const metadata = {
  title: 'TalentAI - RTMN Recruitment',
  description: 'AI-Powered Recruitment Platform powered by RTMN Talent OS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
