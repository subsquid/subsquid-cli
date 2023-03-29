import chalk from 'chalk';
import bytes from 'pretty-bytes';
import blessed, { Box } from 'reblessed';

import { borderBoxTheme, chalkMainColor, scrollBarTheme } from '../theme';

import { CopyableBox, copyable, empty } from './SelectableBox';
import { VersionTab } from './Tabs';
import { SquidVersion } from './types';

export function numberWithSpaces(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export class VersionSummaryTab implements VersionTab {
  async append(parent: Box, squid: SquidVersion) {
    const processorPercent =
      (squid.version.processor.syncState.currentBlock * 100) / squid.version.processor.syncState.totalBlocks;
    const processorState = `Sync ${processorPercent.toFixed(2)}% ${numberWithSpaces(
      squid.version.processor.syncState.currentBlock,
    )} / ${numberWithSpaces(squid.version.processor.syncState.totalBlocks)}`;

    const dbUsedPercent = (squid.version.db.disk.usedBytes * 100) / squid.version.db.disk.totalBytes;
    const dbState = `Used ${dbUsedPercent.toFixed(2)}% ${bytes(squid.version.db.disk.usedBytes)} / ${bytes(
      squid.version.db.disk.totalBytes,
    )}`;

    const lines = [
      ...(squid.version.description ? [copyable(squid.version.description), empty()] : []),

      `${chalkMainColor(`API`)} ${chalkMainColor(squid.version.api.status)}`,
      copyable(`${squid.version.deploymentUrl}`),
      empty(),

      `${chalkMainColor(`PROCESSOR`)} ${chalkMainColor(squid.version.processor.status)}`,
      chalk.dim(processorState),
      empty(),

      `${chalkMainColor(`DB`)} ${chalkMainColor(squid.version.db.disk.usageStatus)}`,
      dbState,
    ];

    parent.append(
      new CopyableBox({
        lines,
      }),
    );
  }
}
