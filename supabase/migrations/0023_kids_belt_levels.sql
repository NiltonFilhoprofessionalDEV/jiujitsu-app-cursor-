-- Kids belts (IBJJF-style) + adult progression for belt_levels lookup.

delete from public.belt_levels;

insert into public.belt_levels (name, "order") values
  ('Branca', 1),
  ('Cinza / Branca', 2),
  ('Cinza', 3),
  ('Cinza / Preta', 4),
  ('Amarela / Branca', 5),
  ('Amarela', 6),
  ('Amarela / Preta', 7),
  ('Laranja / Branca', 8),
  ('Laranja', 9),
  ('Laranja / Preta', 10),
  ('Verde / Branca', 11),
  ('Verde', 12),
  ('Verde / Preta', 13),
  ('Azul', 14),
  ('Roxa', 15),
  ('Marrom', 16),
  ('Preta', 17),
  ('Coral', 18),
  ('Vermelha', 19);
