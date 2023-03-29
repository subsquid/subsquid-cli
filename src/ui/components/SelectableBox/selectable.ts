import { copy } from 'copy-paste';
import blessed, { stripTags } from 'reblessed';

import { borderBoxTheme } from '../../theme';

const COPY_TEXT = '[COPY]';

export function copyable(content: string) {
  const line = blessed.box({
    content,
    height: 1,
    left: 0,
    right: 1,
    top: 0,
    autoFocus: false,
    mouse: false,
  });
  let hovered = false;
  const label = blessed.box({
    content: COPY_TEXT,
    hidden: true,
    left: stripTags(content).length + 2,
    top: 0,
    autoFocus: false,
    style: {
      fg: 'gray',
    },
  });

  line.append(label);

  line.on('wheeldown', () => {
    line.parent?.emit('wheeldown');
  });
  line.on('wheelup', () => {
    line.parent?.emit('wheelup');
  });

  line.on('click', async () => {
    copy(content);
    label.setContent('...COPIED!');

    label.show();
    line.screen.render();

    setTimeout(() => {
      label.setContent(COPY_TEXT);
      if (!hovered) {
        label.hide();
      }
      line.screen.render();
    }, 1000);
  });
  line.on('mouseover', async () => {
    hovered = true;
    label.show();
    line.screen.render();
  });
  line.on('mouseout', async () => {
    hovered = false;
    label.hide();
    label.removeHover();
    line.style = {
      bg: 'default',
    };
    line.screen.render();
  });

  return line;
}
