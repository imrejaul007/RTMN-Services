import './globals.css';

export const metadata = {
  title: 'PeopleOS - RTMN Workforce',
  description: 'Unified HR Employee Portal powered by RTMN Workforce OS',
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
