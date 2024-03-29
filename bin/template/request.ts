type Nullable<T> = T | null;

export type AppSyncRequestResponse<Output> = Promise<
  Output | { errors: string[] } | null
>;

export class AppSyncError extends Error {
  public constructor(public errors: any, message?: string) {
    super(message);
  }
}

let overrideReqFn;

export function setHandler(
  fn: (query: string, variables: Object) => AppSyncRequestResponse<Object>
) {
  overrideReqFn = fn;
}

async function request(query: string, variables: unknown) {
  if (overrideReqFn) return overrideReqFn(query, variables);
  throw new Error("Request handler is not set");
}

// @ts-ignore
export async function apiRequest<T extends TAppSyncQuery>(params: T) {
  const { key, variables } = params;
  // @ts-ignore
  const { queries, mutations } = await defaultGetQueryFn();
  const query = queries[key] || mutations[key];

  const response = await request(query, variables);

  if ("errors" in response) {
    // Additional logging as AppsyncError hides the real error
    console.error(response.errors, query, variables);
    throw new AppSyncError(response.errors);
  }

  const result = (response?.[params.key] || null) as Nullable<
    // @ts-ignore
    TAppSyncReturn[T["key"]]
  >;

  return result;
}
