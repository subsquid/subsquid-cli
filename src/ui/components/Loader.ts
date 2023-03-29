import { defaultsDeep } from 'lodash';
import blessed, { Widgets } from 'reblessed';

import { mainColor } from '../theme';

const frames = ['▰▱▱▱▱▱▱', '▰▰▱▱▱▱▱', '▰▰▰▱▱▱▱', '▰▰▰▰▱▱▱', '▰▰▰▰▰▱▱', '▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰', '▰▱▱▱▱▱▱']; // arr of symbols to form loader

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Loader extends blessed.Box {
  step = 0;
  renderedAt = Date.now();
  interval;

  constructor(options: Widgets.BoxOptions = {}) {
    options = defaultsDeep(options, {
      top: '50%',
      left: '50%',
      style: {
        fg: mainColor,
      },
      content: frames[0],
    });

    if (options.top?.toString().includes('%') && !options.top?.toString().includes('%-')) {
      options.top += '-2';
    }
    if (options.left?.toString().includes('%') && !options.left?.toString().includes('%-')) {
      options.left += '-5';
    }

    super(options);

    this.interval = setInterval(() => {
      this.step = (this.step + 1) % frames.length;

      this.setContent(frames[this.step]);

      this.screen.render();
    }, 100);
  }

  async destroyWithTimeout(minTimeout = 0) {
    if (minTimeout > 0) {
      const sleepTime = Date.now() - this.renderedAt;

      if (sleepTime > 0) {
        await sleep(sleepTime);
      }
    }

    if (!this.parent) {
      return false;
    }

    this.parent.remove(this);
    this.destroy();
    clearInterval(this.interval);
    return true;
  }
}
