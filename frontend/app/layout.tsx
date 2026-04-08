import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'WasteCoin - Waste to Blockchain Rewards',
    description: 'Convert your waste into blockchain-based coins and contribute to a sustainable future',
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
