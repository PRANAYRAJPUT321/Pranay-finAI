import { PageHeader, Card } from "@/components/ui";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="What we store and why" description="PD FinPrep collects only what is needed to run your preparation." />
      <Card className="prose-fin max-w-3xl text-sm text-slate-700">
        <ul>
          <li><strong>Account:</strong> name, email, a securely hashed password (bcrypt), role and preferences — to sign you in and personalise the app.</li>
          <li><strong>Learning activity:</strong> exam selections, study plans, answers, timings, confidence ratings, flashcard reviews, notes and bookmarks — to calculate progress, schedule revision and recommend what to study.</li>
          <li><strong>AI tutor conversations:</strong> stored so you can revisit them. When an external AI provider is configured, your messages and relevant course excerpts are sent to that provider to generate replies.</li>
          <li><strong>Security records:</strong> session records (hashed tokens) and rate-limit counters to protect accounts.</li>
        </ul>
        <p>We do not sell personal data or show advertising. You can export everything we hold about you, or permanently delete your account, from Settings at any time.</p>
      </Card>
    </>
  );
}
