import figlet from 'figlet';
import { defaultsDeep } from 'lodash';
import blessed, { Box, List, Widgets } from 'reblessed';

import { borderBoxTheme, mainColor } from '../theme';

import { Tabs } from './Tabs';
import { SquidVersion } from './types';
import { VersionDbAccessTab } from './VersionDbAccessTab';
import { VersionLogTab } from './VersionLogsTab';
import { VersionSummaryTab } from './VersionSummaryTab';

const figletAsync = (text: string, options?: figlet.Options) => {
  return new Promise<string>((resolve, reject) => {
    figlet(text, options, (error, result) => {
      if (error || !result) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
};

export class VersionView extends List {
  header: Box;
  tabs: Tabs;

  constructor(options: Widgets.BoxOptions) {
    super(
      defaultsDeep(options, borderBoxTheme, {
        tags: true,
        content: '',
      }),
    );

    this.header = blessed.box({
      top: '0',
      left: '0',
      width: '100%-3',
      style: {
        fg: mainColor,
      },
    });

    this.tabs = new Tabs(
      [
        {
          name: 'Summary',
          keys: ['1'],
          renderer: VersionSummaryTab,
        },
        {
          name: 'Logs',
          keys: ['2'],
          renderer: VersionLogTab,
        },
        {
          name: 'DB Access',
          keys: ['3'],
          renderer: VersionDbAccessTab,
        },
        // {
        //   name: 'Deploys',
        //   keys: ['4'],
        //   renderer: VersionDeployTab,
        // },
      ],
      {
        left: 2,
        top: 7,
        // height: '100%-9',
      },
    );

    this.append(this.header);
    this.append(this.tabs);
  }

  async setSquid(squid: SquidVersion) {
    const width = typeof this.width === 'string' ? parseInt(this.width) : this.width;

    const title = await figletAsync(squid.name, { width: width - 3, whitespaceBreak: true });
    const lines = title.split('\n');

    this.tabs.position.top = lines.length + 2;

    this.header.setContent(title);
    this.tabs.setVersion(squid);
    this.setLabel(squid.name);

    this.screen.program;
  }
}
