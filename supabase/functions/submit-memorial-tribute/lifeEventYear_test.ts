import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validLifeEventYear } from '../../../src/lib/lifeEventYear.ts';
Deno.test('completed life events require a known year', () => {
  assertEquals(validLifeEventYear(1952, 2026), true);
  assertEquals(validLifeEventYear(null, 2026), false);
  assertEquals(validLifeEventYear(0, 2026), false);
  assertEquals(validLifeEventYear(1952.5, 2026), false);
  assertEquals(validLifeEventYear(2027, 2026), false);
});