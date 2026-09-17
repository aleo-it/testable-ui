/**
 * Plugin configuration surface for `@testable-ui/vite`.
 */

export interface TestableUiViteOptions {
  /** Attribute name to emit, e.g. `data-testid` or `data-test-id`. Default `data-testid`. */
  attributeName?: string;
  /** Version of the naming algorithm. Default 1. */
  algorithmVersion?: 1;
  /** Max length of the final id (excluding collision suffix). Default 48. */
  maxIdLength?: number;
  /**
   * When `false` and `environment === 'production'`, injection and registry
   * emission are skipped entirely. Default `true`.
   */
  includeInProduction?: boolean;
  /** Current environment. Default `process.env.NODE_ENV`. */
  environment?: string;
  /** Registry output path, resolved against the Vite root. Default `test-ids.generated.ts`. */
  registryFile?: string;
  /** Files to process. Default `/\.(m?[jt]sx?)$/`. */
  include?: RegExp;
  /** Files to skip. Default `/node_modules/`. */
  exclude?: RegExp;
}

export interface ResolvedOptions {
  attributeName: string;
  algorithmVersion: 1;
  maxIdLength: number;
  includeInProduction: boolean;
  environment: string | undefined;
  registryFile: string;
  include: RegExp;
  exclude: RegExp;
}

/** Apply defaults to the user-supplied options. */
export function resolveOptions(options: TestableUiViteOptions): ResolvedOptions {
  return {
    attributeName: options.attributeName ?? 'data-testid',
    algorithmVersion: options.algorithmVersion ?? 1,
    maxIdLength: options.maxIdLength ?? 48,
    includeInProduction: options.includeInProduction ?? true,
    environment: options.environment ?? process.env.NODE_ENV,
    registryFile: options.registryFile ?? 'test-ids.generated.ts',
    include: options.include ?? /\.(m?[jt]sx?)$/,
    exclude: options.exclude ?? /node_modules/,
  };
}