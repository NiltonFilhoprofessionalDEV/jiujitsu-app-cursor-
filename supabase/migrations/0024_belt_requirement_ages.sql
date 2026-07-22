-- Age windows per academy belt requirement (overrides app defaults).

alter table public.academy_belt_requirements
  add column if not exists min_age int
    check (min_age is null or (min_age >= 0 and min_age <= 100)),
  add column if not exists max_age int
    check (max_age is null or (max_age >= 0 and max_age <= 100));

comment on column public.academy_belt_requirements.min_age is
  'Idade mínima sugerida para esta faixa (null = usar default do app)';
comment on column public.academy_belt_requirements.max_age is
  'Idade máxima sugerida para esta faixa (null = sem limite / default do app)';
