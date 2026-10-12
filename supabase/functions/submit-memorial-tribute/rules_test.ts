import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { tributeStatus, validTributePhoto } from './rules.ts';
Deno.test('memories await approval when approval is required', () => {
  assertEquals(tributeStatus(true), 'pending');
  assertEquals(tributeStatus(null), 'pending');
});
Deno.test('automatic publication requires an explicit stored opt out', () => {
  assertEquals(tributeStatus(false), 'approved');
});
Deno.test('tribute photos must belong to this memorial', () => {
  assertEquals(validTributePhoto('abc', 'memorials/abc/tributes/photo.jpg'), true);
  assertEquals(validTributePhoto('abc', 'memorials/other/tributes/photo.jpg'), false);
  assertEquals(validTributePhoto('abc', 'memorials/abc/tributes/../photo.jpg'), false);
});