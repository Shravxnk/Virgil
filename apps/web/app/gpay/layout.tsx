export default function GPayLayout({ children }: { children: React.ReactNode }) {
  // Standalone layout — no analyst sidebar, pure mobile shell
  return <>{children}</>;
}
