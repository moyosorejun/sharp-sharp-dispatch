import type { ReactNode } from 'react';
import type { Order, OrderState, OrderStatus } from '../../call/types';
import { STATUS_PLAIN } from '../../call/types';
import { PackageIcon } from '../Package';
import { Chip, type ChipTone } from '../ui';

/* ---------------------------------------------------------------
   Order card and route tracker (brief 8.5). Slides in when
   check_order runs. Problem states show as a Magenta or Yellow flag.
   --------------------------------------------------------------- */
const STOPS = ['Received', 'Picked up', 'To hub', 'At hub', 'Out for delivery', 'Delivered'];

const ROUTE: Record<OrderStatus, { stop: number; flag?: { tone: 'magenta' | 'yellow'; text: string } }> = {
  order_received: { stop: 0 },
  picked_up: { stop: 1 },
  in_transit_to_hub: { stop: 2 },
  at_hub: { stop: 3 },
  out_for_delivery: { stop: 4 },
  delivered: { stop: 5 },
  failed_delivery: { stop: 4, flag: { tone: 'magenta', text: 'Delivery failed' } },
  on_hold_address_issue: { stop: 4, flag: { tone: 'yellow', text: 'Address issue' } },
  returned_to_sender: { stop: 4, flag: { tone: 'magenta', text: 'Returned to seller' } },
  cancelled: { stop: 0, flag: { tone: 'magenta', text: 'Cancelled' } },
};

const STATUS_CHIP: Record<OrderStatus, { tone: ChipTone; text: string }> = {
  order_received: { tone: 'cream', text: 'Received' },
  picked_up: { tone: 'mint', text: 'Picked up' },
  in_transit_to_hub: { tone: 'mint', text: 'To hub' },
  at_hub: { tone: 'mint', text: 'At hub' },
  out_for_delivery: { tone: 'green', text: 'Out for delivery' },
  delivered: { tone: 'green', text: 'Delivered' },
  failed_delivery: { tone: 'magenta', text: 'Failed delivery' },
  on_hold_address_issue: { tone: 'yellow', text: 'Address issue' },
  returned_to_sender: { tone: 'magenta', text: 'Returned' },
  cancelled: { tone: 'magenta', text: 'Cancelled' },
};

export function OrderPanel({ state }: { state: OrderState }) {
  if (state.kind === 'none')
    return (
      <Empty>
        No order yet. Say your order number, like <span className="font-bold">"Abeg check 1004"</span>.
      </Empty>
    );
  if (state.kind === 'loading')
    return (
      <div className="animate-pulse" aria-busy="true">
        <p className="label text-teal">Order</p>
        <p className="font-mono mt-2 text-xl font-bold">{state.id}</p>
        <p className="mt-3 text-ink/70">Ada dey check...</p>
        <div className="mt-5 h-3 rounded-full bg-ink/10" />
      </div>
    );
  if (state.kind === 'missing') return <Empty>We no fit find {state.id}. Check the number and try again.</Empty>;
  if (state.kind === 'error') return <Empty>Something no work. Abeg try again.</Empty>;
  return <OrderCard order={state.order} />;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="label text-teal">Order</p>
      <p className="mt-3 text-[15px] text-ink/70">{children}</p>
    </div>
  );
}

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const prettyDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Not set';

function OrderCard({ order }: { order: Order }) {
  const route = ROUTE[order.status];
  const chip = STATUS_CHIP[order.status];
  return (
    <div className="anim-slide-in">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xl font-bold">{order.id}</p>
        <Chip tone={chip.tone}>{chip.text}</Chip>
      </div>
      <p className="font-display mt-2 text-[22px] font-extrabold leading-tight">{order.item}</p>
      <p className="mt-1 text-[15px] text-ink/75">
        {order.pickup_area} <span aria-hidden="true">→</span>
        <span className="sr-only">to</span> {order.delivery_area}
      </p>

      <RouteTracker stop={route.stop} flag={route.flag} />

      <p className="mt-4 text-[15px]">{order.status_in_plain_words ?? STATUS_PLAIN[order.status]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        <div>
          <dt className="label text-ink/55">Payment</dt>
          <dd className="font-bold">{order.payment_method === 'prepaid' ? 'Prepaid' : 'Pay on delivery'}</dd>
        </div>
        <div>
          <dt className="label text-ink/55">Fee</dt>
          <dd className="font-mono font-bold">{naira(order.delivery_fee_naira)}</dd>
        </div>
        <div>
          <dt className="label text-ink/55">Expected</dt>
          <dd className="font-bold">{prettyDate(order.expected_delivery)}</dd>
        </div>
        <div>
          <dt className="label text-ink/55">Attempts</dt>
          <dd className="font-mono font-bold">{order.delivery_attempts}</dd>
        </div>
      </dl>
    </div>
  );
}

function RouteTracker({ stop, flag }: { stop: number; flag?: { tone: 'magenta' | 'yellow'; text: string } }) {
  const pct = (i: number) => `${(i / (STOPS.length - 1)) * 100}%`;
  return (
    <div className="route mt-4">
      <div className="relative mx-4 h-16">
        {/* track */}
        <span className="absolute left-0 right-0 top-10 h-[3px] rounded-full bg-ink/15" aria-hidden="true" />
        <span
          className="absolute left-0 top-10 h-[3px] origin-left rounded-full bg-ink"
          style={{ width: pct(stop) }}
          aria-hidden="true"
        />
        {STOPS.map((s, i) => (
          <span
            key={s}
            aria-hidden="true"
            className={`absolute top-[34px] h-[15px] w-[15px] -translate-x-1/2 rounded-full border-2 border-ink ${
              i < stop ? 'bg-ink' : i === stop ? (flag ? (flag.tone === 'magenta' ? 'bg-magenta' : 'bg-yellow') : 'bg-green') : 'bg-white'
            }`}
            style={{ left: pct(i) }}
          />
        ))}
        {/* current stop: floating mini package, or a flag if something went wrong */}
        <span className="absolute top-0 -translate-x-1/2" style={{ left: pct(stop) }} aria-hidden="true">
          {flag ? (
            <svg viewBox="0 0 24 28" className="h-7 w-6">
              <path d="M5 27V3" stroke="var(--ss-ink)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M6 3h14l-4 5 4 5H6z" fill={flag.tone === 'magenta' ? 'var(--ss-magenta)' : 'var(--ss-yellow)'} stroke="var(--ss-ink)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="anim-bob block">
              <PackageIcon className="h-7 w-7" />
            </span>
          )}
        </span>
      </div>
      <ol className="route-labels mt-1 grid grid-cols-6 text-[11px] font-bold leading-tight">
        {STOPS.map((s, i) => (
          <li
            key={s}
            className={`min-w-0 ${i === 0 ? 'text-left' : i === STOPS.length - 1 ? 'text-right' : 'text-center'} ${
              i === stop ? 'text-ink' : 'text-ink/50'
            }`}
            aria-current={i === stop ? 'step' : undefined}
          >
            {s}
          </li>
        ))}
      </ol>
      {flag && (
        <p className="mt-3">
          <Chip tone={flag.tone}>{flag.text}</Chip>
        </p>
      )}
    </div>
  );
}
