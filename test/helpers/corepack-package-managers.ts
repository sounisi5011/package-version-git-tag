import semver from 'semver';

type PackageManagerType = 'npm' | 'yarn' | 'pnpm';
type PackageManagerSpec<
    PMType extends PackageManagerType = PackageManagerType,
> = `${PMType}@${number}.${number}.${number}+blake2b512.${string}`;
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
): PackageManagerSpec<T> =>
    pmList.reduce((a, b) => (semver.lt(omitPmName(a), omitPmName(b)) ? b : a));

export const npmList = getAvailablePackageManagerList({
    'npm@7.24.2+blake2b512.ddcab74d2a318b301b51353f25f7fd6286e4970d2d7efaff7f12a13811f91f64bba533394b221170d82a664b325d73950c61170defc93b5619973e3ce542f7f9':
        '>=10',
    'npm@8.19.4+blake2b512.d821812131623a52a85ace8ddc6c5f09b7a754607843a8a5d3d2fe253c052bfa6c2609560ecffddb7089c5aa9bafec0c90378bd9962b1e44e31c4873b4f0512e':
        '^12.13.0 || ^14.15.0 || >=16.0.0',
    'npm@9.6.2+blake2b512.67a6743b1f9efc57bf5e51322e36f084b0679b9c3b8a958dcac1229fa2edc08a20ab97eecc4285c07f964021c1d667cdf8fe13b2a9061a1c8fc665d757789bd4':
        '^14.17.0 || ^16.13.0 || >=18.0.0',
});
export const latestNpm = getLatestPackageManager(npmList);