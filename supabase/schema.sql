-- Sharp Sharp Dispatch: database schema + mock data
-- Run this whole file in the Supabase SQL Editor (one time).
-- Sharp Sharp Dispatch is a fictional company. All names and orders below are fake.

-- ---------------------------------------------------------------
-- 1. Orders (what the agent looks up with check_order)
-- ---------------------------------------------------------------
create table if not exists orders (
  id                 text primary key,          -- e.g. SSD-1001
  customer_name      text not null,
  item               text not null,
  pickup_area        text not null,
  delivery_area      text not null,
  status             text not null check (status in (
                       'order_received',
                       'picked_up',
                       'in_transit_to_hub',
                       'at_hub',
                       'out_for_delivery',
                       'delivered',
                       'failed_delivery',
                       'on_hold_address_issue',
                       'returned_to_sender',
                       'cancelled'
                     )),
  status_updated_at  timestamptz not null default now(),
  expected_delivery  date,
  delivery_fee_naira integer not null,
  payment_method     text not null check (payment_method in ('prepaid', 'pay_on_delivery')),
  delivery_attempts  integer not null default 0,
  notes              text
);

-- ---------------------------------------------------------------
-- 2. Calls (one row per voice call)
-- (grants for the server's role are at the end of this file)
-- ---------------------------------------------------------------
create table if not exists calls (
  id             text primary key,               -- Vapi call id
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  ended_reason   text,
  main_language  text,                           -- english | pidgin | mixed
  max_confusion  integer default 0,              -- highest confusion score in the call (0-3)
  escalated      boolean not null default false,
  transcript     text
);

-- Pause tracking state, kept on the call row so it works when the server
-- runs as stateless functions (Vercel). Safe to re-run on an existing database.
alter table calls add column if not exists assistant_stopped_at timestamptz;
alter table calls add column if not exists pending_pause_ms     integer;

-- ---------------------------------------------------------------
-- 3. Turns (one row per caller message, logged by the agent)
-- ---------------------------------------------------------------
create table if not exists turns (
  id               bigint generated always as identity primary key,
  call_id          text not null references calls(id) on delete cascade,
  created_at       timestamptz not null default now(),
  caller_said      text,
  language         text,                         -- english | pidgin | mixed
  confusion_score  integer not null check (confusion_score between 0 and 3),
  ladder_level     integer not null check (ladder_level between 0 and 3),
  signals          text[] default '{}',          -- e.g. {'pidgin_confusion_phrase','repeated_question'}
  pause_ms         integer                       -- silence before the caller spoke (measured by the server)
);

create index if not exists turns_call_id_idx on turns(call_id);

-- ---------------------------------------------------------------
-- 4. Escalations (handoffs to a human)
-- ---------------------------------------------------------------
create table if not exists escalations (
  id          bigint generated always as identity primary key,
  call_id     text references calls(id) on delete cascade,
  created_at  timestamptz not null default now(),
  reason      text not null,
  summary     text not null,
  order_id    text,
  notified    boolean not null default false     -- true once n8n accepted the alert
);

-- ---------------------------------------------------------------
-- 5. Mock orders (20). Dates are relative to today so they never go stale.
-- ---------------------------------------------------------------
insert into orders (id, customer_name, item, pickup_area, delivery_area, status, status_updated_at, expected_delivery, delivery_fee_naira, payment_method, delivery_attempts, notes) values
('SSD-1001', 'Chiamaka Obi',      'Phone case and charger',   'Ikeja',          'Yaba',             'delivered',             now() - interval '2 days',  current_date - 2, 2500, 'prepaid',         1, 'Delivered and signed for by customer.'),
('SSD-1002', 'Tunde Bakare',      'Laptop bag',               'Lekki Phase 1',  'Surulere',         'out_for_delivery',      now() - interval '2 hours', current_date,     3000, 'pay_on_delivery', 0, 'Rider left the hub this morning.'),
('SSD-1003', 'Aisha Mohammed',    'Hair products (3 items)',  'Ajah',           'Ikorodu',          'in_transit_to_hub',     now() - interval '5 hours', current_date + 1, 3500, 'prepaid',         0, 'Moving from pickup point to the Ikeja hub.'),
('SSD-1004', 'Emeka Nwosu',       'Sneakers',                 'Yaba',           'Victoria Island',  'at_hub',                now() - interval '1 day',   current_date + 1, 3000, 'prepaid',         0, 'Sorted at Ikeja hub, waiting for tomorrow''s island route.'),
('SSD-1005', 'Funmilayo Adeyemi', 'Ankara fabric (6 yards)',  'Oshodi',         'Ibadan (Bodija)',  'in_transit_to_hub',     now() - interval '1 day',   current_date + 2, 6000, 'prepaid',         0, 'Interstate. Moving from Lagos hub to Ibadan hub.'),
('SSD-1006', 'Ibrahim Sule',      'Bluetooth speaker',        'Ikeja',          'Gbagada',          'failed_delivery',       now() - interval '6 hours', current_date,     2500, 'pay_on_delivery', 1, 'Rider called twice, customer phone was switched off.'),
('SSD-1007', 'Blessing Okafor',   'Perfume',                  'Lekki Phase 1',  'Ajah',             'order_received',        now() - interval '1 hour',  current_date + 1, 2000, 'prepaid',         0, 'Waiting for rider to pick up from seller.'),
('SSD-1008', 'Segun Alabi',       'Gas regulator',            'Surulere',       'Festac',           'on_hold_address_issue', now() - interval '3 hours', current_date + 1, 2500, 'pay_on_delivery', 1, 'Rider could not find the house number. Need landmark or correct address.'),
('SSD-1009', 'Ngozi Eze',         'Books (4)',                'Yaba',           'Abuja (Wuse 2)',   'at_hub',                now() - interval '2 days',  current_date + 2, 7500, 'prepaid',         0, 'Interstate. Waiting at Lagos hub for the Abuja truck.'),
('SSD-1010', 'Kunle Ogunleye',    'Wristwatch',               'Victoria Island','Ikeja GRA',        'picked_up',             now() - interval '40 minutes', current_date,  3000, 'prepaid',         0, 'Rider has the package, heading to Ikeja hub.'),
('SSD-1011', 'Halima Bello',      'Kitchen blender',          'Ikeja',          'Ojota',            'returned_to_sender',    now() - interval '1 day',   null,             2500, 'pay_on_delivery', 3, 'Three failed attempts. Package returned to seller.'),
('SSD-1012', 'Chinedu Okeke',     'Phone (sealed)',           'Computer Village','Port Harcourt (GRA)', 'in_transit_to_hub', now() - interval '20 hours', current_date + 2, 8000, 'prepaid',       0, 'Interstate. On the way to Port Harcourt hub.'),
('SSD-1013', 'Yetunde Fashola',   'Baby clothes',             'Ikorodu',        'Ketu',             'delivered',             now() - interval '5 days',  current_date - 5, 2000, 'pay_on_delivery', 1, 'Delivered. Customer paid rider by transfer.'),
('SSD-1014', 'Musa Danjuma',      'Power bank',               'Ikeja',          'Maryland',         'out_for_delivery',      now() - interval '1 hour',  current_date,     2000, 'prepaid',         1, 'Second attempt after yesterday''s failed delivery.'),
('SSD-1015', 'Adaeze Uche',       'Skincare set',             'Lekki Phase 1',  'Lekki Phase 1',    'cancelled',             now() - interval '3 days',  null,             1500, 'prepaid',         0, 'Cancelled by seller. Refund processed to original payment method.'),
('SSD-1016', 'Olumide Coker',     'Office chair',             'Ikeja',          'Magodo',           'at_hub',                now() - interval '4 hours', current_date + 1, 5000, 'pay_on_delivery', 0, 'Bulky item, needs the van route.'),
('SSD-1017', 'Zainab Yusuf',      'Documents (envelope)',     'Victoria Island','Ikoyi',            'delivered',             now() - interval '3 hours', current_date,     1500, 'prepaid',         1, 'Same-day delivery. Received by security at the gate.'),
('SSD-1018', 'Ikenna Obi',        'Gaming controller',        'Yaba',           'Ikeja',            'failed_delivery',       now() - interval '1 day',   current_date,     2500, 'prepaid',         2, 'Two failed attempts. One more attempt before return.'),
('SSD-1019', 'Bisi Adebayo',      'Shoes (2 pairs)',          'Surulere',       'Ibadan (Ring Road)', 'picked_up',           now() - interval '2 hours', current_date + 2, 6000, 'pay_on_delivery', 0, 'Interstate. Heading to Lagos hub first.'),
('SSD-1020', 'Tobi Martins',      'Mini fridge',              'Ikeja',          'Lekki Phase 1',    'on_hold_address_issue', now() - interval '1 day',   current_date + 1, 6500, 'prepaid',         0, 'Estate gate needs a visitor code from the customer.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Grants: the server uses the secret (service_role) key. Newer Supabase
-- projects do not grant API roles access to tables made in the SQL
-- editor, so grant it here. Only the server gets access: the browser
-- never talks to Supabase directly.
-- ---------------------------------------------------------------
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
