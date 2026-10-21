import { createInterface } from 'node:readline';
import { CommandRouter } from './CommandRouter.js';

export class Repl {
  constructor(private readonly router: CommandRouter) {}

  async start(): Promise<void> {
    const terminal = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal });
    if (terminal) {
      console.log("svg-editor 1.0 — type 'help' for commands");
      input.setPrompt('svg> '); input.prompt();
    }
    for await (const line of input) {
      const result = this.router.run(line);
      if (result) console.log(result);
      if (this.router.shouldExit) { input.close(); break; }
      if (terminal) input.prompt();
    }
  }
}
