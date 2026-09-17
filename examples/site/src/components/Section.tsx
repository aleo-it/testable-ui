import type { ReactNode } from 'react';

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}

/** Consistent page section: eyebrow, heading, lead paragraph, then content. */
export function Section({ id, eyebrow, title, lead, children }: SectionProps) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {lead ? <p className="section-lead">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}