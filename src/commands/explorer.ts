import { Command } from '@oclif/core';
import blessed from 'reblessed';

import { Loader } from '../ui/components/Loader';
import { VersionManager } from '../ui/components/VersionManager';

export default class Explorer extends Command {
  static description = '';
  // static hidden = true;

  async run(): Promise<void> {
    await this.parse(Explorer);

    const screen = blessed.screen({
      smartCSR: true,
      fastCSR: true,
      // dockBorders: true,
      debug: true,
      // autoPadding: true,
      fullUnicode: true,
      sendFocus: false,
      autoPadding: true,
    });

    const manager = new VersionManager({
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
    });

    const loader = new Loader({
      top: '50%',
      left: '50%',
    });

    manager.hide();

    screen.append(loader);
    screen.append(manager);

    await manager.load();
    await loader.destroyWithTimeout();

    manager.show();

    screen.key(['C-c'], () => {
      return process.exit(0);
    });

    manager.focus();
    screen.render();
  }
}
