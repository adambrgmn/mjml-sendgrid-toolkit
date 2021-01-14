declare module 'mjml-parser-xml' {
  import { MJMLJsonObject, Component } from 'mjml-core';

  export interface MJMLParserOptions {
    addEmptyAttributes?: boolean;
    components?: Record<string, Component | undefined>;
    convertBooleans?: boolean;
    keepComments?: boolean;
    filePath?: string;
    actualPath?: string;
    ignoreIncludes?: boolean;
    preprocessors?: ((xml: MJMLJsonObject) => MJMLJsonObject)[];
  }

  export default function MJMLParser(
    mjml: string,
    options: MJMLParserOptions = {},
  ): MJMLJsonObject;
}

declare module 'mjml-validator' {
  import { MJMLJsonObject, MJMLParseError, Component } from 'mjml-core';

  export interface Dependencies {
    [key: string]: string[];
  }

  export interface MJMLValidatorOptions {
    components?: Record<string, Component | undefined>;
    dependencies?: Dependencies;
    initializeType?: any;
  }

  export default function MJMLValidator(
    mjml: MJMLJsonObject,
    options: MJMLValidatorOptions = {},
  ): MJMLParseError[];

  export const dependencies: Dependencies;
}
