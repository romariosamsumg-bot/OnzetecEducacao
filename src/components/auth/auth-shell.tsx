import { Card, Container } from "@/components/ui/primitives";

export function AuthShell({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Container className="py-10">
      <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
        <header className="space-y-2">
          <h1 className="text-[1.75rem] leading-tight font-bold text-navy-900">{title}</h1>
          {description ? <div className="text-ink-soft">{description}</div> : null}
        </header>
        {children}
      </Card>
    </Container>
  );
}
