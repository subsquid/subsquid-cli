import { defaultsDeep } from 'lodash';
import blessed, { Box, Widgets } from 'reblessed';

import { borderBoxTheme, scrollBarTheme } from '../../theme';

export class CopyableBox extends Box {
  items: Box[] = [];

  constructor(options: Widgets.BoxOptions & { lines?: (string | Box)[] }) {
    super(
      defaultsDeep(options, {
        scrollable: true,
        mouse: true,
        scrollbar: scrollBarTheme,
        // content: (options.lines || []).map((l) => (typeof l === 'string' ? l : l.getContent())).join('\n'),
      }),
    );

    this.setLines(options.lines || []);
  }

  setLines(lines: (string | Box)[]) {
    for (const line of lines) {
      this.appendItem(this.createItem(line));
    }
    this.emit('parsed content');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._recalculateIndex();
    this.screen.render();
  }

  createItem(el: string | Box) {
    return typeof el === 'string'
      ? blessed.box({
          content: el,
          left: 0,
          top: 0,
          right: 1,
          height: 1,
        })
      : el;
  }

  appendItem(el: Box) {
    el.position.top = this.items.map((i) => i.height).reduce((x, y) => (x as number) + (y as number), 0);
    if (!this.screen.autoPadding) {
      el.position.top = (this.itop as number) + this.items.length;
    }

    this.append(el);
    this.items.push(el);
  }
}
