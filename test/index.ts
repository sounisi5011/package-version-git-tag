import test from 'ava';

import main from '../src';

test('main() === 42', t => {
    t.is(main(), 42);
});
