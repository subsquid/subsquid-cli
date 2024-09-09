import { Args } from '@oclif/core';

import { removeSquidTag } from '../../api';
import { SqdFlags } from '../../command';
import { DeployCommand } from '../../deploy-command';
import { formatSquidFullname, printSquidFullname } from '../../utils';
import { UPDATE_COLOR } from '../deploy';

export default class Remove extends DeployCommand {
  static description = 'Remove a tag from a squid';

  static args = {
    tag: Args.string({
      description: `New tag to assign`,
      required: true,
    }),
  };

  static flags = {
    org: SqdFlags.org({
      required: false,
      relationships: [
        {
          type: 'all',
          flags: ['name'],
        },
        {
          type: 'some',
          flags: [
            { name: 'slot', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['slot'] },
          ],
        },
      ],
    }),
    name: SqdFlags.name({
      required: false,
      relationships: [
        {
          type: 'some',
          flags: [
            { name: 'slot', when: async (flags) => !flags['tag'] },
            { name: 'tag', when: async (flags) => !flags['slot'] },
          ],
        },
      ],
    }),
    slot: SqdFlags.slot({
      required: false,
      dependsOn: ['name'],
    }),
    tag: SqdFlags.tag({
      required: false,
      dependsOn: ['name'],
      exclusive: ['slot'],
    }),
    fullname: SqdFlags.fullname({
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {
      args: { tag: tagName },
      flags: { fullname, ...flags },
    } = await this.parse(Remove);

    this.validateSquidNameFlags({ fullname, ...flags });

    const { org, name, tag, slot } = fullname ? fullname : (flags as any);
    const reference = formatSquidFullname({ name, slot, tag });

    const organization = await this.promptSquidOrganization({ code: org, name });
    const squid = await this.findOrThrowSquid({ organization, reference });

    if (!squid.tags.some((t) => t.name === tagName)) {
      return this.log(`Tag "${tagName}" is not assigned to the squid ${printSquidFullname({ org, name, tag, slot })}`);
    }

    const deployment = await removeSquidTag({
      organization,
      reference,
      tag: tagName,
    });
    await this.pollDeploy({ organization, deploy: deployment });
    if (!deployment || !deployment.squid) return;

    this.logDeployResult(
      UPDATE_COLOR,
      `The squid ${printSquidFullname({
        org: deployment.organization.code,
        name: deployment.squid.name,
        slot: deployment.squid.slot,
      })} has been successfully updated`,
    );
  }
}
