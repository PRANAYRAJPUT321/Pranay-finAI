/** Re-mounted on every navigation, giving each page a gentle entrance. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
