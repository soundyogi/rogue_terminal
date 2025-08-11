declare module 'koa-bodyparser' {
  import { Middleware } from 'koa';
  
  interface BodyParserOptions {
    enableTypes?: string[];
    encode?: string;
    formLimit?: string;
    jsonLimit?: string;
    textLimit?: string;
    strict?: boolean;
    detectJSON?: (ctx: any) => boolean;
    extendTypes?: {
      json?: string[];
      form?: string[];
      text?: string[];
    };
    onerror?: (err: Error, ctx: any) => void;
  }
  
  function bodyParser(options?: BodyParserOptions): Middleware;
  export = bodyParser;
}