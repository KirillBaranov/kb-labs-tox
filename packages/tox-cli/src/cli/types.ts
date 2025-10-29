/**
 * CLI command module type definition
 */

export type CommandContext = {
  presenter: {
    write: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
    json: (data: any) => void;
  };
  cwd: string;
  flags: Record<string, any>;
  argv: string[];
};

export type CommandModule = {
  run: (ctx: CommandContext, argv: string[], flags: Record<string, any>) => Promise<number | void>;
};

export type CommandManifest = {
  manifestVersion: '1.0';
  id: string;
  aliases?: string[];
  group: string;
  describe: string;
  longDescription?: string;
  requires?: string[];
  flags?: FlagDefinition[];
  examples?: string[];
  loader: () => Promise<{ run: any }>;
};

export type FlagDefinition = {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  alias?: string;
  default?: any;
  description?: string;
  choices?: string[];
  required?: boolean;
};

