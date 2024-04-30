import { ux as CliUx } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  ApiError,
  DeployResponse,
  DeployStatus,
  getDeploy,
  getSquid,
  SquidResponse,
  streamSquidLogs,
  VersionResponse,
} from './api';
import { CliCommand } from './command';
import { doUntil } from './utils';

export abstract class DeployCommand extends CliCommand {
  deploy: DeployResponse | undefined;
  logsPrinted = 0;

  async findSquid({ orgCode, squidName, tagOrId }: { orgCode: string; squidName: string; tagOrId: string }) {
    try {
      return await getSquid({ orgCode, squidName, tagOrId });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.request.status === 404) {
        return null;
      }

      throw e;
    }
  }

  async attachToParallelDeploy(squid: SquidResponse, version: VersionResponse) {
    if (!version || !version.runningDeploy) return false;

    switch (version.runningDeploy.type) {
      // we should react only for running deploy
      case 'DEPLOY':
        const { confirm } = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: `Squid "${squid.name}@${version.name}" is being deploying. 
You can not run deploys on the same squid in parallel.
Do you want to attach to the running deploy process?`,
          },
        ]);
        if (!confirm) return false;

        if (squid.organization) {
          await this.pollDeploy({
            orgCode: squid.organization.code,
            deployId: version.runningDeploy.id,
            streamLogs: true,
          });
        }

        return true;
    }
  }

  async pollDeploy({
    orgCode,
    deployId,
    streamLogs,
  }: {
    orgCode: string;
    deployId: string;
    streamLogs: boolean;
  }): Promise<void> {
    let lastStatus: string;
    let validatedPrinted = false;

    await doUntil(
      async () => {
        this.deploy = await getDeploy({ orgCode, id: deployId });

        if (!this.deploy) return true;
        if (this.deploy.status !== lastStatus) {
          lastStatus = this.deploy.status;
          CliUx.ux.action.stop('✔️');
        }

        this.printDebug();

        switch (this.deploy.status) {
          case DeployStatus.UNPACKING:
            CliUx.ux.action.start('◷ Preparing the squid');
            if (this.isFailed()) return this.showError(`❌ An error occurred while unpacking the squid`);

            return false;
          case DeployStatus.RESETTING:
            CliUx.ux.action.start('◷ Resetting the squid');
            if (this.isFailed()) return this.showError(`❌ An error occurred while resetting the squid`);

            return false;
          case DeployStatus.IMAGE_BUILDING:
            CliUx.ux.action.start('◷ Building the squid');

            if (!validatedPrinted) {
              this.log(
                '◷ You may now detach from the build process by pressing Ctrl + C. The Squid deployment will continue uninterrupted.',
              );
              this.log('◷ The new squid will be available as soon as the deployment is complete.');
              validatedPrinted = true;
            }

            if (this.isFailed()) return this.showError(`❌ An error occurred while building the squid`);

            return false;
          case DeployStatus.IMAGE_PUSHING:
            CliUx.ux.action.start('◷ Pushing the image');
            if (this.isFailed()) return this.showError(`❌ An error occurred while publishing the squid`);

            return false;
          case DeployStatus.DEPLOYING:
            CliUx.ux.action.start('◷ Deploying the squid');
            if (this.isFailed()) return this.showError(`❌ An error occurred while deploying the squid`);

            return false;
          case DeployStatus.OK:
            this.log(
              `The squid is up and running. The GraphQL API will be shortly available at ${this.deploy.deploymentUrl}`,
            );

            const { squidName, versionName, orgCode } = this.deploy;
            if (streamLogs && squidName && versionName && orgCode) {
              CliUx.ux.action.start(`Streaming logs from the squid`);
              await streamSquidLogs({
                orgCode,
                squidName,
                versionName,
                onLog: (l) => this.log(l),
              });
            }

            return true;
          default:
            /**
             * Just wait if some unexpected status has been received.
             * This behavior is more safe for forward compatibility
             */
            return false;
        }
      },
      { pause: 3000 },
    );
  }
  printDebug = () => {
    if (!this.deploy) return;

    const logs = this.deploy.logs.slice(this.logsPrinted);
    if (logs.length === 0) return;

    this.logsPrinted += logs.length;

    logs
      .filter((v) => v)
      .forEach(({ severity, message }) => {
        switch (severity) {
          case 'info':
            this.log(chalk.cyan(message));
            return;
          case 'warn':
            this.log(chalk.yellow(message));
            return;
          case 'error':
            this.log(chalk.red(message));
            return;
          default:
            this.log(chalk.dim(message));
        }
      });
  };

  showError(text: string, reason?: string): never {
    CliUx.ux.action.stop('❌');

    reason = reason || this.deploy?.failed || 'UNEXPECTED';
    const errors: (string | null)[] = [text];
    if (reason === 'UNEXPECTED') {
      errors.push(
        `------`,
        'Please report to Discord https://discord.gg/KRvRcBdhEE or SquidDevs https://t.me/HydraDevs',
        `${chalk.dim('Deploy:')} ${this.deploy?.id}`,
        this.deploy?.squidName ? `${chalk.dim('Squid:')} ${this.deploy?.squidName}` : null,
        this.deploy?.versionName ? `${chalk.dim('Version:')} ${this.deploy?.versionName}` : null,
      );
    }

    // FIXME: maybe we should send an error report ourselves here with more details?
    this.error(errors.filter(Boolean).join('\n'));
  }

  isFailed() {
    if (!this.deploy) return true;

    return this.deploy.failed !== 'NO';
  }
}
