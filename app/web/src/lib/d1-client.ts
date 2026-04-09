type D1Config = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getD1Config(): D1Config | null {
  const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = readEnv("CLOUDFLARE_D1_DATABASE_ID");
  const apiToken = readEnv("CLOUDFLARE_API_TOKEN");
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

export type D1Result<T> = { success: boolean; results: T[] };

export async function d1Query<T>(sql: string, params: unknown[] = []) {
  const config = getD1Config();
  if (!config) {
    throw new Error("D1 is not configured on server.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiToken}`
      },
      body: JSON.stringify({ sql, params })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`D1 query failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const payload = await response.json();
  const result = payload?.result?.[0];
  if (!result?.success) {
    throw new Error("D1 query did not succeed.");
  }
  return result as D1Result<T>;
}
