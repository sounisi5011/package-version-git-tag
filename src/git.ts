import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function tagExists(tagName: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync('git', ['tag', '-l', tagName]);
        return stdout.split(/[\r\n]+/).includes(tagName);
    } catch (error) {
        throw new Error(`tagExists() Error: ${error}`);
    }
}

export async function isHeadTag(tagName: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync('git', [
            'tag',
            '-l',
            tagName,
            '--points-at',
            'HEAD',
        ]);
        return stdout.split(/[\r\n]+/).includes(tagName);
    } catch (error) {
        throw new Error(`isHeadTag() Error: ${error}`);
    }
}

export async function setTag(tagName: string): Promise<void> {
    try {
        await execFileAsync('git', ['tag', tagName]);
    } catch (error) {
        throw new Error(`setTag() Error: ${error}`);
    }
}

export async function push(
    src: string,
    repository: string = 'origin',
): Promise<void> {
    try {
        await execFileAsync('git', ['push', repository, src]);
    } catch (error) {
        throw new Error(`push() Error: ${error}`);
    }
}