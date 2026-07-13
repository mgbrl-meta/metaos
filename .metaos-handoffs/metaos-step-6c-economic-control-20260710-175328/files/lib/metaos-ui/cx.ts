export type MetaOSClassValue =
  | string
  | false
  | null
  | undefined;

export function cx(
  ...values: MetaOSClassValue[]
): string {
  return values.filter(Boolean).join(" ");
}
