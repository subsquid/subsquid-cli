import { format } from 'date-fns';
import { defaultsDeep } from 'lodash';
import blessed, { Box, List, TextElement, Widgets } from 'reblessed';

import { VersionResponse } from '../../api';
import { borderBoxTheme, mainColor, mainLightColor } from '../theme';

import { SquidVersion } from './types';

function unicodeLength(str: string) {
  return [...str.replace(/{[^}]+}/g, '')].length;
}

function unicodePadEnd(str: string, need: number) {
  const length = unicodeLength(str);

  if (length >= need) {
    return str;
  }

  return str + new Array(need - length).fill(' ').join('');
}

function apiStatus(status: VersionResponse['api']['status']) {
  switch (status) {
    case 'AVAILABLE':
      return '✓';
    case 'NOT_AVAILABLE':
      return 'x';
    default:
      return status;
  }
}

function processorStatus(version: VersionResponse) {
  switch (version.processor.status) {
    case 'SYNCING':
    case 'SYNCED':
      const percent = (100 * version.processor.syncState.currentBlock) / version.processor.syncState.totalBlocks;
      return `${percent.toFixed(2)}%`;
    default:
      return version.processor.status;
  }
}

function dbUsage(status: VersionResponse['db']['disk']['usageStatus']) {
  switch (status) {
    case 'LOW':
      return ' ▰▱▱▱ ';
    case 'NORMAL':
      return ' ▰▰▱▱ ';
    case 'WARNING':
      return ' ▰▰▰▱ ';
    case 'CRITICAL':
      return ' ▰▰▰▰ ';
    case 'UNKNOWN':
      return ' ---- ';
    default:
      return status;
  }
}

function versionStatus(status: VersionResponse['deploy']['status']) {
  switch (status) {
    case 'HIBERNATED':
      return status;
    case 'DEPLOYED':
      return '✓';
    case 'DEPLOYING':
      return '...';
    default:
      return status;
  }
}

export class SquidList extends Box {
  rows: List;
  text: TextElement;
  squids: SquidVersion[] = [];

  constructor(options: Widgets.BoxOptions) {
    super(
      defaultsDeep(options, borderBoxTheme, {
        label: 'Squids',
        padding: {
          left: 0,
          right: 0,
        },
      }),
    );

    this.rows = blessed.list({
      keys: true,
      tags: true,
      mouse: true,
      invertSelected: false,
      top: 1,
      width: '100%-3',
      height: '100%-3',
      baseLimit: 0,
      style: {
        fg: mainColor,
        item: {},
        selected: {
          fg: 'white',
          bg: mainColor,
        },
      },
    });
    this.text = blessed.text({
      top: 0,
    });

    this.rows.on('select item', (item: Widgets.BlessedElement) => {
      const index = this.rows.getItemIndex(item);
      this.screen.debug(index.toString());
      this.emit('select', index);
    });

    this.append(this.rows);
    this.append(this.text);

    this.screen.on('resize', () => {
      this.screen.debug(`resize ${this.screen.width}`);

      this.recalculateTable(this.squids);
      this.screen.render();
    });
  }

  calculateRows(headers: string[], data: string[][], maxWidth = Infinity) {
    const max: number[] = [];
    headers.forEach((v, i) => {
      max[i] = Math.max(unicodeLength(v) + 1, max[i] || 0);
    });

    data.forEach((row) => {
      row.forEach((v, i) => {
        max[i] = Math.max(unicodeLength(v) + 1, max[i] || 0);
      });
    });

    let lastIndex = 0;
    let width = 0;
    max.forEach((m, i) => {
      width += m;
      if (width < maxWidth) {
        lastIndex = i;
      }
    });

    return {
      header: headers.slice(0, lastIndex + 1).reduce((res, v, i) => res + unicodePadEnd(v, max[i]), ''),
      rows: data.map((row) => row.slice(0, lastIndex + 1).reduce((res, v, i) => res + unicodePadEnd(v, max[i]), '')),
    };
  }

  recalculateTable(squids: SquidVersion[]) {
    this.screen.debug('recalculate table');

    const data: string[][] = squids.map((s) => {
      return [
        s.name,
        versionStatus(s.version.deploy.status),
        !s.isHibernated() ? apiStatus(s.version.api.status) : '',
        !s.isHibernated() ? processorStatus(s.version) : '',
        !s.isHibernated() ? dbUsage(s.version.db.disk.usageStatus) : '',
        s.version.deployedAt ? format(new Date(s.version.deployedAt), 'dd.MM.yy') : '',
      ];
    });

    const width = typeof this.width === 'string' ? parseInt(this.width) : this.width;

    this.screen.debug(`manager resize ${width}`);

    const { header, rows } = this.calculateRows(
      ['Name', 'Deploy', 'API', 'Processor', ' DB ', 'Deployed'].map((s) => s.toUpperCase()),
      data,
      width,
    );

    this.setLabel(`Squids (${squids.length})`);
    this.text.setContent(header);
    this.rows.setItems(rows.map((r, i) => this.colorize(r, squids[i])));

    this.squids = squids;
  }

  colorize(data: string, squid: SquidVersion) {
    const color = squid.getColor();

    if (!color) return data;

    return `{${color}-fg}${data}{/${color}-fg}`;
  }
}
