\set ON_ERROR_STOP on
create function public.t_as(u int, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt', json_build_object('sub', format('00000000-0000-0000-0000-%s', lpad(u::text, 12, '0')), 'aal', aal)::text, false) $$;
create function public.t_id(u int) returns uuid language sql as $$ select format('00000000-0000-0000-0000-%s', lpad(u::text, 12, '0'))::uuid $$;
create function public.t_raises(q text, expected text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm ilike '%' || expected || '%' then raise notice 'ok  refused: %', expected; return; end if;
    raise exception 'wrong error for [%]: %', q, sqlerrm;
  end;
  raise exception 'should have failed: %', q;
end $$;
grant execute on function public.t_as(int,text), public.t_id(int), public.t_raises(text,text) to authenticated, anon;

-- 1 customer, 2 worker, 3 other customer, 4 super admin
insert into auth.users select t_id(i), 'u' || i || '@example.com', json_build_object('name', 'User ' || i, 'phone', '070000000' || i, 'role', r)
from (values (1,'customer'), (2,'worker'), (3,'customer'), (4,'admin')) v(i, r);
do $$ begin assert (select role from profiles where id = t_id(4)) = 'customer', 'sign-up must not create staff'; end $$;
update profiles set role = 'admin', staff_role = 'super' where id = t_id(4);

set role authenticated;
select t_raises('select * from public.profiles', 'permission denied');
select t_raises('update public.bookings set cancel_fee = 0', 'permission denied');
select t_raises($q$select public.notify(t_id(1), 'x', 'y')$q$, 'permission denied');

select t_as(2);
select register_worker('Sample address', 'Nugegoda', 6.8649, 79.8997, 5, '', '', array['new-wiring'], t_id(2) || '/p.jpg', t_id(2) || '/id.jpg');
select t_raises(format('select admin_review_worker(%L, %L)', t_id(2), 'approved'), 'staff role');
select t_as(4, 'aal1');
select t_raises(format('select admin_review_worker(%L, %L)', t_id(2), 'approved'), 'staff role');
do $$ begin assert jsonb_array_length(app_state()->'users') = 0, 'admin without 2FA sees nothing'; end $$;
select t_as(4, 'aal2');
select admin_review_worker(t_id(2), 'approved');

select t_as(1);
select save_address('Home', 'Sample Lane 12', 'Nugegoda', 6.872, 79.889);
select create_booking('new-wiring', t_id(2), (app_state()->'addresses'->0->>'id')::uuid,
  '{"size":200,"points":6,"switches":4,"fixtures":3,"work":"replace","built":"yes"}');
do $$ declare s jsonb := app_state(); begin
  assert s->'bookings'->0->>'status' = 'requested';
  assert (s->'bookings'->0->'estimate'->>'total')::int > 0;
  assert (select u->>'phone' from jsonb_array_elements(s->'users') u where u->>'id' = t_id(2)::text) is null, 'phone hidden before acceptance';
  assert s->'workers'->0->'address' = 'null'::jsonb and s->'workers'->0->'documents' = '[]'::jsonb, 'worker private data hidden';
end $$;

select t_as(3);
do $$ begin assert jsonb_array_length(app_state()->'bookings') = 0, 'strangers see no bookings'; end $$;
select set_config('t.b', '', false);
reset role; select set_config('t.b', id::text, false) from bookings; set role authenticated;
select t_raises(format('select cancel_booking(%L)', current_setting('t.b')), 'Booking not found');
select t_raises(format('select send_message(%L, %L)', current_setting('t.b'), 'hi'), 'Booking not found');

select t_as(2);
do $$ begin assert app_state()->'bookings'->0->>'address' = 'Nugegoda', 'street hidden before acceptance'; end $$;
select worker_respond(current_setting('t.b')::uuid, true);
do $$ begin assert app_state()->'bookings'->0->>'address' = 'Sample Lane 12'; end $$;
select propose_time(current_setting('t.b')::uuid, now() + interval '1 second');
select t_raises(format('select respond_time(%L, true)', current_setting('t.b')), 'no date waiting');
select t_as(1); select respond_time(current_setting('t.b')::uuid, true);
select t_as(2);
select start_trip(current_setting('t.b')::uuid);
select share_location(current_setting('t.b')::uuid, 6.866, 79.897);
select t_as(1);
do $$ begin assert jsonb_array_length(app_state()->'locations') = 1; end $$;
select t_raises(format('select mark_arrived(%L)', current_setting('t.b')), 'cannot do this');
select t_as(2); select mark_arrived(current_setting('t.b')::uuid);
select request_extra(current_setting('t.b')::uuid, 1500, 'Needs a new breaker');
select t_raises(format('select mark_completed(%L)', current_setting('t.b')), 'price change');
select t_as(1); select respond_extra(current_setting('t.b')::uuid, true);
select t_as(2); select mark_completed(current_setting('t.b')::uuid);
select t_as(1); select confirm_completion(current_setting('t.b')::uuid);
select submit_review(current_setting('t.b')::uuid, 5, 'Great', 500);
select t_raises(format('select submit_review(%L, 5)', current_setting('t.b')), 'already reviewed');

-- Late cancellation fee and monthly worker limit
create temp table ids (n int, id uuid);
do $$ declare i int; a uuid := (app_state()->'addresses'->0->>'id')::uuid; begin
  for i in 1..9 loop perform create_booking('new-wiring', t_id(2), a, '{}'); end loop;
end $$;
select t_raises(format('select create_booking(%L, %L, %L, %L)', 'new-wiring', t_id(2), app_state()->'addresses'->0->>'id', '{}'), 'Too many bookings');
reset role; grant all on ids to authenticated;
insert into ids select row_number() over (), id from bookings where status = 'requested';
set role authenticated; select t_as(2);
select worker_respond(id, true) from ids;
reset role; update bookings set created_at = now() - interval '2 hours' where id in (select id from ids where n = 9); set role authenticated;
select t_as(1); select cancel_booking(id) from ids where n in (8, 9);
reset role; do $$ begin
  assert (select cancel_fee from bookings b join ids i using (id) where n = 8) = 0, 'free within an hour';
  assert (select cancel_fee from bookings b join ids i using (id) where n = 9) = 50, 'fee after an hour';
end $$; set role authenticated;
select t_as(2); select cancel_booking(id) from ids where n <= 6;
select t_raises(format('select cancel_booking(%L)', (select id from ids where n = 7)), 'all 6 cancellations');
do $$ declare w jsonb := app_state()->'workers'->0; begin
  assert (w->>'cancelsThisMonth')::int = 6; assert (w->>'rating')::numeric = 4.7; assert (w->>'reliability')::int = 70;
end $$;

-- Payments: cash commission, card earnings, settlement and the owing limit
reset role;
do $$ declare b bookings; begin
  select * into b from bookings where status = 'confirmed';
  assert balance_of(t_id(2)) = commission_of(b), 'cash job puts commission on the worker';
end $$;
create temp table pay as select id from bookings where status = 'accepted' limit 1;
update bookings set status = 'confirmed', completed_at = now(), payment_method = 'card' where id = (select id from pay);
grant select on pay to authenticated, service_role;
set role authenticated; select t_as(1);
select t_raises(format('select record_card_payment(%L, %L, 1, 2)', (select id from pay), 'X'), 'permission denied');
select t_raises(format('select create_booking(%L, %L, %L, %L)', 'new-wiring', t_id(2), app_state()->'addresses'->0->>'id', '{}'), 'Pay for your last card job');
set role service_role;
do $$ declare id_ uuid := (select id from pay); v int; begin
  reset role; select job_value(b) into v from bookings b where id = id_; set role service_role;
  assert record_card_payment(id_, 'P0', v - 1, 2) = 'needs review', 'wrong amount is not accepted';
  assert record_card_payment(id_, 'P1', v, 2) = 'paid';
  assert record_card_payment(id_, 'P1', v, 2) = 'already recorded';
  assert record_card_payment(id_, 'P2', v, 2) = 'needs review', 'second payment is flagged';
end $$;
reset role; do $$ begin assert balance_of(t_id(2)) < 0, 'card earnings offset commission'; end $$;
set role service_role;
do $$ declare id_ uuid := (select id from pay); begin assert record_card_payment(id_, 'P1', 0, -3) = 'reversed'; end $$;
reset role; do $$ begin assert balance_of(t_id(2)) > 0; end $$;
insert into ledger (worker_id, kind, amount) values (t_id(2), 'reversal', 6000);
update bookings set paid_at = now() where id = (select id from pay);
set role authenticated; select t_as(1);
select t_raises(format('select create_booking(%L, %L, %L, %L)', 'new-wiring', t_id(2), app_state()->'addresses'->0->>'id', '{}'), 'not available');
do $$ begin assert app_state()->'workers'->0->'balance' = 'null'::jsonb and (app_state()->'workers'->0->>'blocked')::boolean; assert jsonb_array_length(app_state()->'ledger') = 0; end $$;
select t_as(2);
select t_raises(format('select submit_settlement(999999, %L, %L)', 'REF1', t_id(2) || '/s.jpg'), 'more than you owe');
select submit_settlement(5000, 'REF1', t_id(2) || '/s.jpg');
select t_raises(format('select submit_settlement(10, %L, %L)', 'REF2', t_id(2) || '/s.jpg'), 'still being checked');
select t_raises(format('select admin_review_settlement(%L, true)', gen_random_uuid()), 'staff role');
select t_as(4, 'aal2');
select admin_review_settlement((app_state()->'settlements'->0->>'id')::uuid, true);
do $$ begin assert not (app_state()->'workers'->0->>'blocked')::boolean, 'paying unblocks'; end $$;

set role anon; select set_config('request.jwt', '', false);
do $$ begin assert jsonb_array_length(app_state()->'users') = 0 and jsonb_array_length(app_state()->'services') = 15; end $$;
select t_raises($q$select mark_notifications_read()$q$, 'permission denied');
\echo ALL DATABASE CHECKS PASSED
