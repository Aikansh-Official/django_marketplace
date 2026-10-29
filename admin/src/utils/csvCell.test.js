import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCSVCell } from './csvCell.js';

test('formula-like cells are rendered as text', () => {
  for (const input of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1']) {
    assert.ok(escapeCSVCell(input).startsWith('"\''));
  }
});

test('ordinary text, quotes and empty values remain valid CSV', () => {
  assert.equal(escapeCSVCell('Book, "new"'), '"Book, ""new"""');
  assert.equal(escapeCSVCell(null), '""');
  assert.equal(escapeCSVCell(125), '"125"');
});
