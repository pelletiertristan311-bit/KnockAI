import type { Metadata } from 'next';
import KnockAIApp from '@/components/knockai/KnockAIApp';

export const metadata: Metadata = {
  title: 'KnockAI',
  description: 'Door-to-door sales intelligence app',
};

export default function KnockAIPage() {
  return <KnockAIApp />;
}
