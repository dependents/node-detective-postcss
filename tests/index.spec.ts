import detective = require('../src');

function assert(source: string, deps: string[]) {
    expect(detective(source)).toEqual(deps);
}

describe('node-detective-postcss', () => {
    describe('@import', () => {
        it('detects simple imports', () => {
            assert('@import "foo.css"', ['foo.css']);
        });

        describe('url()', () => {
            it('works with url()', () => {
                assert('@import url("navigation.css");', ['navigation.css']);
            });

            it('works with single quotes', () => {
                assert("@import url('navigation.css');", ['navigation.css']);
            });

            it('works with no quotes', () => {
                assert('@import url(navigation.css);', ['navigation.css']);
            });
        });

        it('detects multiple imports', () => {
            assert('@import "1.css"; @import "2.css"; @import "3.css"', [
                '1.css',
                '2.css',
                '3.css',
            ]);
        });

        it('ignores media', () => {
            assert('@import "printstyle.css" print;', ['printstyle.css']);
        });

        it('ignores media query', () => {
            assert('@import "bar.css" (min-width: 25em);', ['bar.css']);
        });

        it('ignores both', () => {
            assert('@import "mobstyle.css" screen and (max-width: 768px);', [
                'mobstyle.css',
            ]);
        });

        it('ignores URLs', () => {
            assert(
                "@import url('https://fonts.googleapis.com/css?family=Roboto:300,400');",
                []
            );
        });

        it('does not touch the paths', () => {
            assert('@import "../../././bla.css"', ['../../././bla.css']);
        });
    });

    describe('@value', () => {
        // see https://github.com/css-modules/postcss-icss-values
        it('extracts from single values', () => {
            assert("@value primary from 'colors.css';", ['colors.css']);
        });

        it('works with url()', () => {
            assert("@value primary from url('colors.css');", ['colors.css']);
        });

        it('extracts from multiple values', () => {
            assert("@value primary, secondary from 'colors.css';", [
                'colors.css',
            ]);
        });

        it('works with aliases', () => {
            assert(
                "@value small as bp-small, large as bp-large from 'breakpoints.css';",
                ['breakpoints.css']
            );
        });

        it('works with grouped aliases', () => {
            assert(
                "@value (small as t-small, large as t-large) from 'typo.css';",
                ['typo.css']
            );
        });

        it('leaves simple definitions alone', () => {
            assert('@value mine: #fff;', []);
        });

        it('leaves calculated definitions alone', () => {
            assert('@value mine: calc(1px + 4px)', []);
        });
    });
});
