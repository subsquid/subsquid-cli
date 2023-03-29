import { defaultsDeep, flatten } from 'lodash';
import { Box, List, Widgets } from 'reblessed';

import { squidList } from '../../api';

import { SquidList } from './SquidList';
import { SquidVersion } from './types';
import { VersionView } from './VersionView';

export class VersionManager extends Box {
  list: SquidList;
  view: VersionView;
  squids: SquidVersion[] = [];
  currentIndex?: number;

  constructor(options: Widgets.BoxOptions) {
    super(options);

    this.list = new SquidList({
      top: 0,
      left: 0,
      width: '30%',
      height: '100%',
    });

    this.view = new VersionView({
      top: '0',
      left: '30%',
      width: '70%',
      height: '100%',
    });

    this.list.on('select', (index: number) => {
      this.updateCurrentSquidByIndex(index);
    });

    this.append(this.list);
    this.append(this.view);
  }

  focus() {
    this.list.rows.focus();
  }

  async load() {
    const squids = await squidList();

    this.squids = flatten(
      squids.map((squid) =>
        squid.versions.map((v) => {
          return new SquidVersion(squid, v);
        }),
      ),
    ).sort((a, b) => a.name.localeCompare(b.name));

    await this.list.recalculateTable(this.squids);

    if (this.currentIndex === undefined) {
      await this.updateCurrentSquidByIndex(0);
    }

    setTimeout(() => this.load(), 10000);
  }

  async updateCurrentSquidByIndex(index: number) {
    const squid = this.squids[index];
    if (!squid) return;

    await this.view.setSquid(squid);

    this.currentIndex = index;

    this.screen.render();
  }
}
