import chalk from 'chalk';
import blessed, { Box } from 'reblessed';

import { chalkMainColor, scrollBarTheme } from '../theme';

import { copyable, CopyableBox, empty } from './SelectableBox';
import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export class VersionDbAccessTab implements VersionTab {
  async append(parent: Box, squid: SquidVersion) {
    parent.append(
      new CopyableBox({
        lines: [
          chalkMainColor(`URL`),
          copyable(squid.version.db.ingress.url),
          empty(),

          chalkMainColor(`DB`),
          copyable(squid.version.db.ingress.db),
          empty(),

          chalkMainColor(`User`),
          copyable(squid.version.db.ingress.user),
          empty(),

          chalkMainColor(`Password`),
          copyable(squid.version.db.ingress.password),
          empty(),
          empty(),

          chalkMainColor(`PSQL command`),
          copyable(
            `PGPASSWORD=${squid.version.db.ingress.password} pqsl -h ${squid.version.db.ingress.url} -d ${squid.version.db.ingress.db} -U ${squid.version.db.ingress.user}`,
          ),
        ],
      }),
    );
  }
}
