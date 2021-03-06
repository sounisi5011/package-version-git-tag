import * as fs from 'fs';
import { promisify } from 'util';

export { execFileAsync } from '../../src/utils';

export const writeFile = promisify(fs.writeFile);

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
