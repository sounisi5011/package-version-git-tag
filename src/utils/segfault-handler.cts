import path from 'path';
import SegfaultHandler from 'segfault-handler';

SegfaultHandler.registerHandler(path.join(process.cwd(), 'crash.log'));
