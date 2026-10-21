import { Editor } from './application/Editor.js';
import { CommandRouter } from './cli/CommandRouter.js';
import { Repl } from './cli/Repl.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';

await new Repl(new CommandRouter(new Editor(new NodeDocumentStore()))).start();
