import detective from '../src';

function assert(source: string, deps: string[]) {
    expect(detective(source)).toEqual(deps);
}

describe('node-detective-postcss', () => {
    describe('@import', () => {
        it('detects simple imports', () => {
            assert('@import "foo.css"', ['foo.css']);
        });

        it('works with url()', () => {
            assert('@import url("navigation.css");', ['navigation.css']);
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
    });
});
