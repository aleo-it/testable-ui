import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  code: string;
  /** Optional filename shown in the header. */
  title?: string;
  /** Optional language tag shown in the header. */
  lang?: string;
}

/** A bordered, copyable code block with an optional filename header. */
export function CodeBlock({ code, title, lang }: CodeBlockProps) {
  return (
    <figure className="code-block">
      <figcaption className="code-block-head">
        <span className="code-block-meta">
          {title ? <span className="code-block-title">{title}</span> : null}
          {lang ? <span className="code-block-lang">{lang}</span> : null}
        </span>
        <CopyButton text={code} label={`Copy ${title ?? 'code block'}`} />
      </figcaption>
      <pre className="code-block-pre">
        <code>{code}</code>
      </pre>
    </figure>
  );
}