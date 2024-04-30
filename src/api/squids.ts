import split2 from 'split2';

import { pretty } from '../logs';

import { api, debugLog } from './api';
import { getDemoSquid, listDemoSquids, Squid } from './demoStore';
import {
  DeployResponse,
  HttpResponse,
  LogEntry,
  LogsResponse,
  SquidNameIsAvailableResponse,
  SquidResponse,
  UploadUrlResponse,
} from './types';

export async function squidList({ orgCode }: { orgCode: string }) {
  return listDemoSquids(orgCode).sort((a, b) => {
    return new Date(b.deployedAt || 0).valueOf() - new Date(a.deployedAt || 0).valueOf();
  });

  // const { body } = await api<HttpResponse<SquidResponse[]>>({
  //   method: 'get',
  //   path: `/orgs/${orgCode}/squids`,
  // });
  //
  // return body.payload;
}

export async function getSquid({
  orgCode,
  squidName,
  tagOrId,
}: {
  orgCode: string;
  squidName: string;
  tagOrId: string;
}): Promise<Squid> {
  return getDemoSquid(orgCode, squidName, tagOrId);

  // const { body } = await api<HttpResponse<SquidResponse>>({
  //   method: 'get',
  //   path: `/orgs/${orgCode}/squids/${squidName}`,
  //   query: {
  //     versionName,
  //   },
  // });
  //
  // return body.payload;
}

export async function squidNameIsAvailable(squidName: string): Promise<boolean> {
  const { body } = await api<HttpResponse<SquidNameIsAvailableResponse>>({
    method: 'get',
    path: `/squids/${squidName}/available`,
  });

  return Boolean(body.payload?.available);
}

export async function versionHistoryLogs({
  orgCode,
  squidName,
  versionName,
  query,
  abortController,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  query: {
    limit: number;
    from: Date;
    nextPage?: string;
    orderBy?: string;
    container?: string[];
    level?: string[];
    search?: string;
  };
  abortController?: AbortController;
}): Promise<LogsResponse> {
  const { body } = await api<LogsResponse>({
    method: 'get',
    path: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/logs/history`,
    query: {
      ...query,
      from: query.from.toISOString(),
      level: query.level?.map((l) => l.toUpperCase()),
    },
    abortController,
  });

  return body || { logs: [], nextPage: null };
}

export async function versionLogsFollow({
  orgCode,
  query,
  squidName,
  versionName,
  abortController,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  query: { container?: string[]; level?: string[]; search?: string };
  abortController?: AbortController;
}) {
  const { body } = await api<NodeJS.ReadableStream>({
    method: 'get',
    path: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/logs/follow`,
    query,
    responseType: 'stream',
    abortController: abortController,
  });

  return body;
}

export async function streamSquidLogs({
  orgCode,
  squidName,
  versionName,
  abortController,
  query = {},
  onLog,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
  onLog: (log: string) => unknown;
  query?: { container?: string[]; level?: string[]; search?: string };
  abortController?: AbortController;
}) {
  let attempt = 0;
  let stream: NodeJS.ReadableStream;

  while (true) {
    debugLog(`streaming logs`);
    const retry = await new Promise(async (resolve) => {
      try {
        stream = await versionLogsFollow({
          orgCode,
          squidName,
          versionName,
          query,
          abortController,
        });
      } catch (e: any) {
        /**
         * 524 status means timeout
         */
        if (e.status === 524) {
          debugLog(`streaming logs timeout occurred`);
          return resolve(true);
        }

        debugLog(`streaming logs error thrown: ${e.status} ${e.message}`);

        return resolve(false);
      }

      stream
        .pipe(split2())
        .on('error', async (e: any) => {
          debugLog(`streaming logs error received: ${e.message}`);

          resolve(true);
        })
        .on('data', (line: string) => {
          if (line.length === 0) return;

          try {
            const entries: LogEntry[] = JSON.parse(line);
            pretty(entries).forEach((l) => {
              onLog(l);
            });
          } catch (e) {
            onLog(line);
          }
        })
        .on('close', async () => {
          debugLog(`streaming logs stream closed`);

          resolve(true);
        })
        .on('end', async () => {
          debugLog(`streaming logs stream ended`);

          resolve(true);
        });
    });

    if (!retry) {
      debugLog(`streaming logs exited`);
      return;
    }

    attempt++;
    debugLog(`streaming logs retrying, ${attempt} attempt...`);
  }
}

export async function deploySquid({
  orgCode,
  data,
}: {
  orgCode: string;
  data: {
    hardReset: boolean;
    artifactUrl: string;
    manifestPath: string;
  };
}): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'post',
    path: `/orgs/${orgCode}/squids/deploy`,
    data,
  });

  return body.payload;
}

export async function getUploadUrl({ orgCode }: { orgCode: string }): Promise<UploadUrlResponse> {
  const { body } = await api<HttpResponse<UploadUrlResponse>>({
    method: 'post',
    path: `/orgs/${orgCode}/deploys/upload-url`,
  });

  return body.payload;
}

export async function restartSquid({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
}): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'put',
    path: `/orgs/${orgCode}/squids/${squidName}/version/${versionName}/redeploy`,
  });

  return body.payload;
}

export async function destroyVersion({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
}): Promise<string> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'delete',
    path: `/orgs/${orgCode}/squids/${squidName}/version/${versionName}`,
  });

  return `Destroyed Squid "${body.payload.name}" version ${body.payload.versions?.[0]?.name}`;
}

export async function destroySquid({ orgCode, squidName }: { orgCode: string; squidName: string }): Promise<string> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'delete',
    path: `/orgs/${orgCode}/squids/${squidName}`,
  });

  return `Destroyed Squid ${body.payload.name}`;
}
