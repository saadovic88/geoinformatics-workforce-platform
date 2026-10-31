import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('password dialog is portalled outside the sticky navigation header', () => {
  const source = readFileSync('src/components/auth/ChangePasswordModal.tsx', 'utf8');
  assert.match(source, /import \{ createPortal \} from 'react-dom'/);
  assert.match(source, /createPortal\(modal, document\.body\)/);
  assert.match(source, /fixed inset-0 z-\[200\]/);
});

test('password dialog limits only its own card height', () => {
  const stylesheet = readFileSync('src/index.css', 'utf8');
  assert.match(stylesheet, /\.change-password-dialog \{/);
  assert.match(stylesheet, /max-height: calc\(100dvh/);
});
