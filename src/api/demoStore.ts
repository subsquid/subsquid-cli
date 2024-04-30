import * as crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import Table from 'cli-table3';

import { ApiError } from './api';
import { DeploymentStatus, SquidOrganizationResponse } from './types';

const FILE_PATH = path.join(process.cwd(), 'squids-demo.json');

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH).toString()) as Squid[];
  } catch (e) {
    return [];
  }
}

type ApiUrl = { type: 'canonical'; url: string; tag?: never } | { type: 'tag'; tag: string; url: string };
export type Squid = {
  id: number;
  name: string;
  hashId: string;
  tags: string[];
  status: DeploymentStatus;
  deployedAt: Date;
  organization?: SquidOrganizationResponse;
  api: {
    url: ApiUrl[];
  };
};

type SquidDeployChange = {
  type: 'new_deploy' | 'update_deploy' | 'assign_tag' | 'remove_tag' | 'assign_url' | 'remove_url';
  squid_hash_id: string;
  value?: string;
};

function lastSquidId() {
  return readFile().length;
}

function writeFile(data: Squid[]) {
  return fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function listDemoSquids(orgCode: string) {
  return readFile().filter((s) => s.organization?.code === orgCode);
}

function getByIdOrHash(squids: Squid[], name: string, idOrTag: string) {
  if (idOrTag.startsWith('@')) {
    const tag = idOrTag.slice(1);

    return squids.find((s) => s.name === name && s.tags.includes(tag));
  }

  if (idOrTag.startsWith('#')) {
    const id = idOrTag.slice(1);

    return squids.find((s) => s.name === name && s.hashId === id);
  }

  return squids.find((s) => s.name === name && (s.hashId === idOrTag || s.tags.includes(idOrTag)));
}

export function getDemoSquid(orgCode: string, name: string, idOrTag: string) {
  const squids = listDemoSquids(orgCode);
  const squid = getByIdOrHash(squids, name, idOrTag);
  if (!squid) {
    throw new ApiError({ status: 404, method: 'get', url: '/squids' }, { error: 'Squid not found' });
  }

  return squid;
}

export async function rmDemoSquid(orgCode: string, name: string, idOrTag: string) {
  const squids = listDemoSquids(orgCode);

  const squid = getByIdOrHash(squids, name, idOrTag);
  if (!squid) return;

  writeFile(squids);
}

function getRandomHash() {
  const hash = crypto.createHash('sha1').update(new Date().toISOString()).digest('hex');

  return hash.slice(0, 5);
}

function removeTag(squid: Squid, tag: string) {
  const changes: SquidDeployChange[] = [];

  if (squid.tags.find((t) => t === tag)) {
    changes.push({ type: 'remove_tag', squid_hash_id: squid.hashId, value: tag });
    squid.tags = squid.tags.filter((t) => t !== tag);
  }

  const url = squid.api.url.find((u) => u.type === 'tag' && u.tag === tag);
  if (url) {
    changes.push({ type: 'remove_url', squid_hash_id: squid.hashId, value: url.url });
    squid.api.url = squid.api.url.filter((u) => u.type !== 'tag' || (u.type === 'tag' && u.tag !== tag));
  }

  return changes;
}

function addTag(squid: Squid, orgCode: string, name: string, tag: string) {
  const changes: SquidDeployChange[] = [];

  if (squid.api.url.find((u) => u.type === 'tag' && u.tag === tag)) {
    return changes;
  }

  const newUrl = `https://${orgCode}.squids.live/${name}/${tag}/graphql`;
  squid.tags.push(tag);
  squid.api.url.push({
    tag,
    type: 'tag',
    url: newUrl,
  });
  changes.push({ type: 'assign_tag', squid_hash_id: squid.hashId, value: tag });
  changes.push({ type: 'assign_url', squid_hash_id: squid.hashId, value: newUrl });

  return changes;
}

export async function deployDemoSquid({
  orgCode,
  tag,
  name,
  update,
}: {
  orgCode: string;
  name: string;
  tag?: string;
  update?: string;
  data: Record<string, unknown>;
}): Promise<{ deployed: Squid; changes: SquidDeployChange[] }> {
  const squids = listDemoSquids(orgCode);

  await sleep(1000);

  const hashId = getRandomHash();
  const changes: SquidDeployChange[] = [];

  let deployedSquid: Squid = {
    id: lastSquidId() + 1,
    name,
    hashId,
    status: 'DEPLOYED',
    tags: [],
    api: { url: [] },
    deployedAt: new Date(),
    organization: {
      id: orgCode,
      code: orgCode,
      name: orgCode,
    },
  };

  if (update) {
    const prev = getByIdOrHash(squids, name, update);
    if (!prev) {
      throw new Error('SQUID NOT EXISTS');
    }

    deployedSquid = prev;
    deployedSquid.deployedAt = new Date();
    changes.push({ type: 'update_deploy', squid_hash_id: deployedSquid.hashId });
  } else {
    deployedSquid.api.url.push({
      type: 'canonical',
      url: `https://${orgCode}.squids.live/${name}/-/${hashId}/graphql`,
    });
    changes.push({ type: 'new_deploy', squid_hash_id: deployedSquid.hashId });
  }

  if (tag) {
    const prev = getByIdOrHash(squids, name, tag);
    if (prev) {
      changes.push(...removeTag(prev, tag));
    }

    changes.push(...addTag(deployedSquid, orgCode, name, tag));
  }

  if (!update) {
    squids.push(deployedSquid);
  }

  writeFile(squids);

  return { deployed: deployedSquid, changes };
}

export async function updateDemoTag({
  orgCode,
  tagOrId,
  name,
  newTag,
}: {
  orgCode: string;
  name: string;
  tagOrId: string;
  newTag: string;
}) {
  const changes: SquidDeployChange[] = [];

  const squids = listDemoSquids(orgCode);
  if (squids.find((s) => s.name === name && s.hashId.includes(newTag))) {
    throw new Error(
      [
        `Tag ${chalk.bold(newTag)} can not be assigned to the squid ${chalk.bold(name)} due to conflict with id.`,
        `Please choose a ${chalk.bold('unique')} tag for the squid.`,
      ].join('\n'),
    );
  }

  const squid = getByIdOrHash(squids, name, tagOrId);
  if (!squid) {
    throw new Error('SQUID NOT EXISTS');
  }

  if (squid.tags.includes(newTag)) {
    throw new Error(`Tag ${newTag} already assigned to this squid`);
  }

  const prev = getByIdOrHash(squids, name, newTag);

  if (prev && prev.hashId !== squid.hashId) {
    changes.push(...removeTag(prev, newTag));
  }

  changes.push(...addTag(squid, orgCode, name, newTag));

  writeFile(squids);

  return {
    changes,
  };
}

function formatTags(squid: Squid, changes: SquidDeployChange[]) {
  const color = getColor(changes);

  return [
    // Add removed urls
    ...changes.filter((c) => c.type === 'remove_tag').map((c) => chalk.red(`--- ${chalk.bold(c.value)}`)),
    // Check if url is assigned
    ...squid.tags.map((tag) => {
      const assigned = changes.find((c) => c.type === 'assign_tag' && c.value === tag);
      const value = chalk.bold(tag);

      return assigned ? chalk.green(`+++ ${value}`) : color(value);
    }),
  ];
}

function getSquidUrl(api: ApiUrl[], type: 'canonical' | 'tag') {
  return (api || []).filter((u) => u.type === type);
}

function formatUrl(url: ApiUrl) {
  if (url.type === 'tag') {
    return chalk.bold(url.url);
  }

  return url.url;
}

function formatUrls(squid: Squid, changes: SquidDeployChange[]) {
  const currentUrl = [...getSquidUrl(squid.api.url, 'tag'), ...getSquidUrl(squid.api.url, 'canonical')];
  const color = getColor(changes);

  return [
    // Add removed urls
    ...changes.filter((c) => c.type === 'remove_url').map((c) => chalk.red(`--- ${c.value}`)),
    // Check if url is assigned
    ...currentUrl.map((url) => {
      const assigned = changes.find((c) => c.type === 'assign_url' && c.value === url.url);

      const value = formatUrl(url);

      return assigned ? chalk.green(`+++ ${value}`) : color(value);
    }),
  ];
}

export const UPDATE_COLOR = 'cyan';
export const CREATE_COLOR = 'green';

function getColor(changes: SquidDeployChange[]) {
  if (changes.find((c) => c.type === 'update_deploy')) {
    return chalk[UPDATE_COLOR];
  }
  if (changes.find((c) => c.type === 'new_deploy')) {
    return chalk[CREATE_COLOR];
  }

  return (v: string) => v;
}

export function buildTable(
  squids: Squid[],
  { changes = [], limit }: { changes?: SquidDeployChange[]; limit?: number } = {},
) {
  const table = new Table({
    wordWrap: true,
    head: ['Deploy ID', 'Name', 'Tag', 'API URL', 'Status', 'Deployed'],
    wrapOnWordBoundary: true,
    style: {
      head: ['bold'],
      border: ['dim'],
      // compact: true,
    },
  });

  const originalSquidsLength = squids.length;

  if (limit) {
    if (changes.length) {
      const allHashes = changes.map((s) => s.squid_hash_id);
      const changed = squids.filter((s) => allHashes.includes(s.hashId));

      squids = [
        ...changed,
        ...(limit - changed.length > 0
          ? squids.filter((s) => !allHashes.includes(s.hashId)).slice(0, limit - changed.length)
          : []),
      ].sort((a, b) => {
        return new Date(b.deployedAt || 0).valueOf() - new Date(a.deployedAt || 0).valueOf();
      });
    } else {
      squids = squids.slice(0, limit);
    }
  }

  squids.map((squid) => {
    const squidsChanges = changes.filter((c) => c.squid_hash_id === squid.hashId);

    const color = getColor(squidsChanges);

    const row = [
      color(squid.hashId),
      color(squid.name),
      formatTags(squid, squidsChanges).join('\n'),
      formatUrls(squid, squidsChanges).join('\n'),
      color(squid.status),
      color(formatDate(squid.deployedAt)),
    ];

    table.push(row);
  });

  if (limit && originalSquidsLength > limit) {
    table.push([
      {
        content: chalk.reset(`... use "${chalk.bold(`sqd ls -o ${squids[0].organization?.code}`)}" to all squids ...`),
        colSpan: 6,
        hAlign: 'center',
      },
    ]);
  }

  return table.toString();
}

function formatDate(date?: string | Date) {
  if (!date) return '';

  const isoDate = new Date(date).toISOString();
  return `${isoDate.substring(0, 10)} ${isoDate.substring(11, 19)} ${chalk.dim('UTC')}`;
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
