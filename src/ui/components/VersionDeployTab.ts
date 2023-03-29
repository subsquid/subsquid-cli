import blessed, { Box } from 'reblessed';

import { getDeploys } from '../../api';
import { mainColor } from '../theme';

import { Loader } from './Loader';
import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export class VersionDeployTab implements VersionTab {
  async append(parent: Box, { version }: SquidVersion) {
    const list = blessed.listtable({
      top: 0,
      left: 0,
      // tags: true,
      style: {
        header: {
          align: 'left',
          fg: 'white',
        },
        selected: {
          bg: mainColor,
        },
        fg: mainColor,
        item: {
          align: 'left',
          fg: 'white',
        },
      },
      mouse: true,
    });
    list.hide();
    const loader = new Loader();
    parent.append(list);
    parent.append(loader);

    const deploys = await getDeploys({ versionId: version.id });

    list.setRows([
      ['ID', 'Status', 'Failed', 'Logs', 'Created'],
      ...deploys.map((deploy) => {
        return [deploy.id, deploy.status, deploy.failed, deploy.logs.length.toString(), deploy.createdAt];
      }),
    ]);

    await loader.destroyWithTimeout();
    list.show();
    list.screen.render();
  }
}
