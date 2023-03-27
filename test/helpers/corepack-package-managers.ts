import semver from 'semver';

type PackageManagerType = 'npm' | 'yarn' | 'pnpm';
type PackageManagerSpec<
    PMType extends PackageManagerType = PackageManagerType,
> = `${PMType}@${number}.${number}.${number}${
    | ''
    | `-${string}`}+blake2b512.${string}`;
type GetPackageManagerType<PMSpec extends PackageManagerSpec> =
    PMSpec extends PackageManagerSpec<infer PMType> ? PMType : never;

const getAvailablePackageManagerList = <
    PMSpec extends PackageManagerSpec,
    PMType extends PackageManagerType = GetPackageManagerType<PMSpec>,
>(
    pmRecord: Record<PMSpec, string>,
): PackageManagerSpec<PMType>[] =>
    (Object.entries as <K extends string, V>(o: Record<K, V>) => [K, V][])(
        pmRecord,
    )
        .filter(([, supportedNode]) =>
            semver.satisfies(process.version, supportedNode),
        )
        .map(([pmSpec]) => pmSpec as PackageManagerSpec<PMType>);

const omitPmName = (pmSpec: PackageManagerSpec): string =>
    pmSpec.replace(/^[^@]+@/, '');

const getLatestPackageManager = <T extends PackageManagerType>(
    pmList: readonly PackageManagerSpec<T>[],
    options?: { includePrerelease?: boolean },
): PackageManagerSpec<T> =>
    pmList
        .map((pmSpec) => ({
            pmSpec,
            semver: new semver.SemVer(omitPmName(pmSpec)),
        }))
        // Note: We intentionally do not provide an initial value to the `.reduce()` method.
        //       If there is no value to return (i.e., `pmList` is an empty array), an error should be thrown.
        //       We could throw a readable error message, but since this is test code, we decided it was not necessary.
        .reduce((a, b) => {
            return (options?.includePrerelease ||
                semver.prerelease(b.semver) === null) &&
                semver.lt(a.semver, b.semver)
                ? b
                : a;
        }).pmSpec;

export const npmList = getAvailablePackageManagerList({
    'npm@7.24.2+blake2b512.ddcab74d2a318b301b51353f25f7fd6286e4970d2d7efaff7f12a13811f91f64bba533394b221170d82a664b325d73950c61170defc93b5619973e3ce542f7f9':
        '>=10',
    'npm@8.19.4+blake2b512.d821812131623a52a85ace8ddc6c5f09b7a754607843a8a5d3d2fe253c052bfa6c2609560ecffddb7089c5aa9bafec0c90378bd9962b1e44e31c4873b4f0512e':
        '^12.13.0 || ^14.15.0 || >=16.0.0',
    'npm@9.6.2+blake2b512.67a6743b1f9efc57bf5e51322e36f084b0679b9c3b8a958dcac1229fa2edc08a20ab97eecc4285c07f964021c1d667cdf8fe13b2a9061a1c8fc665d757789bd4':
        '^14.17.0 || ^16.13.0 || >=18.0.0',
});
export const latestNpm = getLatestPackageManager(npmList);

export const yarnList = [
    'yarn@1.22.19',
] as unknown as PackageManagerSpec<'yarn'>[];
export const latestYarn = getLatestPackageManager(yarnList);

export const pnpmList = getAvailablePackageManagerList({
    'pnpm@6.35.1+blake2b512.5d0f8e66b6e6d0f67f9430991b507709b3cc9e7b584e412ed8cd191fe289a6a7dd7acc878f8fa2de6d289cfc7827168892d3069107c5e023884990146ef54cc4':
        '>=12.17',
    'pnpm@7.30.4+blake2b512.89bc2a182193a526fb4df064e0b798f4e11d9bf2c99323314eb85e778d4a9a61f7014a574a04203afb5cfa2bec33dc04ba978609502207fe0be9e61c78737e39':
        '>=14.6',
    'pnpm@8.0.0-rc.1+blake2b512.e13d8f613e00f5bae52c1960fef959309c406963259cc86d690e2ba3d3a37ec847c36bae1b40e98191b27ab18c60cdbd701b9fcd755299a3552755a2804bc7b8':
        '>=16.14',
});
export const latestPnpm = getLatestPackageManager(pnpmList);

export const allList = [...npmList, ...yarnList, ...pnpmList] as const;
export const latestList = [latestNpm, latestYarn, latestPnpm] as const;
