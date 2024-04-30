import { Args, Flags } from '@oclif/core';

import { squidList } from '../api';
import { buildTable, updateDemoTag } from '../api/demoStore';
import { DeployCommand } from '../deploy-command';

function parseSquidNameArg(value: string) {
  if (value.includes('@')) {
    const [name, tagOrId] = value.split('@');

    return { name, tagOrId };
  }

  throw new Error('Invalid squid name format. Please use {squid}@{tag} or {squid}@{id}');
}

export default class Tag extends DeployCommand {
  static description = 'Set a tag for squid';

  static args = {
    squid: Args.string({
      description: `Full squid name, i.e. {squid}@{tag} or {squid}@{id}`,
      required: true,
    }),
    tag: Args.string({
      description: `New tag to assign`,
      required: true,
    }),
  };

  static flags = {
    org: Flags.string({
      char: 'o',
      description: 'Organization',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { squid: squidName, tag: newTag },
      flags: { org },
    } = await this.parse(Tag);

    const { name, tagOrId } = parseSquidNameArg(squidName);

    const orgCode = await this.promptOrganization(org, 'using "-o" flag');

    const { changes } = await updateDemoTag({
      orgCode,
      name,
      tagOrId,
      newTag,
    });

    const newSquids = await squidList({ orgCode });

    this.log(buildTable(newSquids, { changes, limit: 10 }));
  }
}
