import { Flags } from '@oclif/core';

import { squidList } from '../api';
import { buildTable } from '../api/demoStore';
import { CliCommand } from '../command';

export default class Ls extends CliCommand {
  static aliases = ['squid:ls'];
  static description = 'List squids and squid versions deployed to the Cloud';

  static flags = {
    name: Flags.string({
      char: 'n',
      description: 'squid name',
      required: false,
    }),
    truncate: Flags.boolean({
      char: 't',
      description: 'truncate data in columns: false by default',
      required: false,
      default: false,
    }),
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      flags: { org, truncate, name },
    } = await this.parse(Ls);
    const noTruncate = !truncate;
    const orgCode = await this.promptOrganization(org, 'using "-o" flag');

    let squids = await squidList({ orgCode });
    if (name) {
      squids = squids.filter((s) => s.name === name);
    }

    this.log(buildTable(squids));
  }
}
