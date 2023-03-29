import { defaultsDeep } from 'lodash';
import blessed, { Box, Widgets } from 'reblessed';

import { mainColor } from '../theme';

import { SquidVersion } from './types';

interface VersionTabConstructor {
  new (): VersionTab;
}

export type Cancellable = void | (() => void) | undefined;

export interface VersionTab {
  append(holder: Box, squid: SquidVersion): Promise<Cancellable>;
}

export type Tab = {
  name: string;
  keys: string[];
  renderer: VersionTabConstructor;
};

export class Tabs extends Box {
  menu: any;
  squid: SquidVersion | undefined;
  selectedTab = 0;
  wrapper: Box | undefined;
  cancel: Cancellable | undefined;

  constructor(tabs: Tab[], options: Widgets.BoxOptions = {}) {
    super(defaultsDeep(options));

    const commands = tabs.reduce((res, tab, currentIndex) => {
      return {
        ...res,
        [tab.name]: {
          keys: tab.keys,
          callback: async () => {
            // if (this.selectedTab === currentIndex) return;
            if (!this.squid) return;
            if (this.squid?.isHibernated()) {
              return;
            }

            if (typeof this.cancel === 'function') {
              this.cancel();
            }

            this.selectedTab = currentIndex;
            this.wrapper?.destroy();
            this.wrapper = blessed.box({
              top: 2,
              left: '15',
              // mouse: true,
              // height: '100%',
              // border: {
              //   type: 'line',
              // },
              // parent: this,
              // style: {
              //   border: { fg: '#fff' },
              // },
            });

            this.append(this.wrapper);
            this.cancel = await new tab.renderer().append(this.wrapper, this.squid);
            // try {
            // } catch (e) {}
          },
        },
      };
    }, {});

    this.menu = blessed.listbar({
      top: '0',
      left: '0',
      width: '100%-10',

      autoCommandKeys: false,
      keys: true,
      mouse: true,
      style: {
        item: {
          fg: 'white',
          bg: 'black',
        },
        selected: {
          fg: 'white',
          bg: mainColor,
        },
      },
      commands,
    } as any);

    this.append(this.menu);

    // this.menu.selectTab(this.selectedTab);
  }

  setVersion(squid: SquidVersion) {
    // if (squid === this.squid) return;
    this.screen.debug('set version');
    this.squid = squid;

    if (squid.isHibernated()) {
      this.wrapper?.destroy();
      this.wrapper = blessed.box({
        top: '40',
        left: '15',
        content: `The squid is hibernated due to inactivity. Redeploy it to activate`,
      });
      this.append(this.wrapper);
      this.menu.hide();
    } else {
      this.menu.show();
      this.menu.selectTab(this.selectedTab);
    }
  }
}
