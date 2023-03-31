export const packageManagerTypeList = [
    'npm',
    'yarn',
    'pnpm',
] as const satisfies readonly Lowercase<string>[];
export type PackageManagerType = (typeof packageManagerTypeList)[number];

// The "Array.prototype.includes()" method is slow, so we create a Set object to use the "Set.prototype.has()" method instead.
const packageManagerTypeSet = new Set(packageManagerTypeList);
export function isPackageManagerType(
    value: unknown,
): value is PackageManagerType {
    return (packageManagerTypeSet as Set<unknown>).has(value);
}

export interface PackageManagerData {
    name: PackageManagerType | undefined;
    spawnArgs: [commandName: string, prefixArgs: string[]];
}

export interface PackageManagerInfo {
    name: PackageManagerType;
}
