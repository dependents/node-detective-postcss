import { describe, it, expect } from 'vitest';
import detective from '../index.js';

describe('issue 351: unquoted data: URLs', () => {
  describe('declaration ({ url: true })', () => {
    const dataDecl =
      '.icon { background: url(data:image/png;base64,iVBORw0KGgo=) no-repeat; }';
    const fileDecl = '.logo { background: url(logo.png); }';

    it('ignores the data URL', () => {
      expect(detective(dataDecl, { url: true })).toStrictEqual([]);
    });

    it('still finds the file URL next to a data URL', () => {
      expect(detective(`${dataDecl} ${fileDecl}`, { url: true })).toStrictEqual(
        ['logo.png'],
      );
    });
  });

  describe('@value (default)', () => {
    const dataValue = '@value icon: url(data:image/png;base64,iVBORw0KGgo=);';
    const fileValue = '@value primary from "colors.css";';

    it('ignores the data URL', () => {
      expect(detective(dataValue)).toStrictEqual([]);
    });

    it('still finds the file import next to a data URL', () => {
      expect(detective(`${dataValue}\n${fileValue}`)).toStrictEqual([
        'colors.css',
      ]);
    });
  });

  describe('@import (default)', () => {
    const dataImport = '@import url(data:text/css;base64,LmF7fQ==);';
    const fileImport = '@import "b.css";';

    it('ignores the data URL', () => {
      expect(detective(dataImport)).toStrictEqual([]);
    });

    it('still finds the file import next to a data URL', () => {
      expect(detective(`${dataImport}\n${fileImport}`)).toStrictEqual([
        'b.css',
      ]);
    });
  });
});
