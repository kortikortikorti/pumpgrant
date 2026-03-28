import { Lock, Zap, Shield, Clock, HelpCircle, TrendingUp, Gift, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const steps = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: '1. Create a Grant',
      desc: 'Visit PumpGrant and enter a Reddit username you want to fund, along with token details (name, ticker, description). PumpGrant launches the token on pump.fun.',
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: '2. Fees Are Locked',
      desc: 'The fee authority is immediately revoked on-chain. This is permanent — no one, not even PumpGrant, can change where the fees go. Every trade fee is directed to a smart contract tagged with the Reddit user.',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: '3. Fees Accumulate',
      desc: 'As people trade the token on pump.fun, trading fees automatically accumulate in the smart contract. The more trading volume, the more SOL the Reddit user earns.',
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: '4. Redditor Claims',
      desc: 'The Reddit user visits PumpGrant, verifies their Reddit account by posting a unique code on their profile, connects their Solana wallet, and claims their accumulated SOL.',
    },
  ];

  const faqs = [
    {
      q: 'Is this safe?',
      a: 'Yes. The fee lock is enforced on-chain via the Solana blockchain. Once the fee authority is revoked, it\'s mathematically impossible to redirect the fees elsewhere. Your auto-generated wallet private key is encrypted at rest and only you can access it.',
    },
    {
      q: 'Can the creator take the fees?',
      a: 'No. The fee authority is revoked on-chain when the grant is created. This is irreversible. The creator has no special access or control over the accumulated fees — they belong entirely to the beneficiary Reddit user.',
    },
    {
      q: 'How does Reddit verification work?',
      a: 'Instead of OAuth, PumpGrant generates a unique code. You post it on your Reddit profile as a comment or post. PumpGrant checks your public profile to confirm the code — no API keys or permissions needed. Simple and trustless.',
    },
    {
      q: 'How often are fees collected?',
      a: 'Fees accumulate in real-time with every trade on pump.fun. There\'s no delay — each trade immediately adds to the available balance that the beneficiary can claim.',
    },
    {
      q: 'Do I need a Solana wallet to create a grant?',
      a: 'Yes, you need a Solana wallet address to create a grant (this is your identity as the creator). However, the Reddit beneficiary does NOT need one — PumpGrant auto-generates a wallet for them when they sign in.',
    },
    {
      q: 'Can I create multiple grants for the same Redditor?',
      a: 'Yes! Multiple tokens can be launched with fees directed to the same Reddit user. They\'ll see all their grants when they verify and can claim from each individually.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="text-3xl font-bold text-center mb-4">How PumpGrant Works</h1>
      <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
        PumpGrant lets anyone fund a Redditor by launching a pump.fun token with permanently locked trading fees. 
        It's trustless, transparent, and built on Solana.
      </p>

      {/* Steps */}
      <div className="space-y-6 mb-16">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-[#222] bg-[#141414] p-6 hover:border-[#FF4500]/20 transition-colors">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF4500]/10 text-[#FF4500]">
              {step.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Key Features */}
      <div className="rounded-2xl border border-[#222] bg-[#141414] p-8 mb-16">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Why PumpGrant?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400 mx-auto mb-3">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white mb-1">Trustless</h3>
            <p className="text-xs text-gray-500">On-chain fee lock. No trust required.</p>
          </div>
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mx-auto mb-3">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white mb-1">Self-Custody</h3>
            <p className="text-xs text-gray-500">You own your wallet. Export your key anytime.</p>
          </div>
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF4500]/10 text-[#FF4500] mx-auto mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-white mb-1">Permanent</h3>
            <p className="text-xs text-gray-500">Fee authority revoked. Can never be changed.</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
      <div className="space-y-4 mb-12">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl border border-[#222] bg-[#141414] p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-[#FF4500] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF4500] to-[#FF6B35] px-8 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-[#FF4500]/20"
        >
          <Zap className="h-4 w-4" />
          Create a Grant Now
        </Link>
      </div>
    </div>
  );
}
