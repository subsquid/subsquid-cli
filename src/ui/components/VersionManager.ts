import { defaultsDeep, flatten } from 'lodash';
import { List, Widgets } from 'reblessed';

import { squidList } from '../../api';

import { SquidList } from './SquidList';
import { SquidVersion } from './types';
import { VersionView } from './VersionView';

export class VersionManager extends List {
  list: SquidList;
  view: VersionView;
  squids: SquidVersion[] = [];
  currentIndex?: number;

  constructor(
    public organization: string,
    options: Widgets.BoxOptions,
  ) {
    super(
      defaultsDeep(options, {
        vi: true,
        keys: true,
        mouse: true,
      }),
    );

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

    this.key(['up', 'down'], (ch, key) => {
      this.list.rows.emit('keypress', ch, key);
    });

    this.append(this.list);
    this.append(this.view);
  }

  async load() {
    const squids = await squidList({ orgCode: this.organization });

    // this.squids = flatten(
    //   squids.map((squid) =>
    //     squid.versions.map((v) => {
    //       return new SquidVersion(squid, v);
    //     }),
    //   ),
    // ).sort((a, b) => a.name.localeCompare(b.name));

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
