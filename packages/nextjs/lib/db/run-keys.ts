/** Primary keys for decision run items inside the single `APP_TABLE`. */
export const RUN_ENTITY_PREFIX = "RUN#";

export function runPartitionKey(run_id: string): string {
  return `${RUN_ENTITY_PREFIX}${run_id}`;
}

export function runSortKey(run_id: string): string {
  return runPartitionKey(run_id);
}
