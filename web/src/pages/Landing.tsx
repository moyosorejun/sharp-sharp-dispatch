import { Link } from 'react-router-dom';
import { Nav, Footer } from '../components/Chrome';
import { AdirePattern, BlockCluster, Ribbons, SlicedHeadline, SpinningBadge } from '../components/Decor';
import { Package } from '../components/Package';
import { Button, Card, Chip, MicIcon, type ChipTone } from '../components/ui';

/* Test orders from supabase/schema.sql, with lines to try. */
const TRY_ORDERS: { id: string; status: string; tone: ChipTone; lines: string[] }[] = [
  { id: 'SSD-1004', status: 'At hub', tone: 'mint', lines: ['Abeg check 1004', 'Wetin be hub?'] },
  { id: 'SSD-1006', status: 'Failed delivery', tone: 'magenta', lines: ['Check order 1006', 'Why e no reach me?'] },
  { id: 'SSD-1008', status: 'Address issue', tone: 'yellow', lines: ['My order na 1008', 'I no understand, which address?'] },
  { id: 'SSD-1002', status: 'Out for delivery', tone: 'green', lines: ['Can you check order 1002?', 'When will it arrive?'] },
];

const LADDER = [
  { level: 0, title: 'Normal answer', body: 'Short and direct. "Your sneakers dey our hub."', tone: 'conf0' as const },
  { level: 1, title: 'Smaller steps', body: 'One idea at a time, then "You dey follow?"', tone: 'conf1' as const },
  { level: 2, title: 'Analogy', body: 'The hub is like a bus park where packages wait for the right bus.', tone: 'conf2' as const },
  { level: 3, title: 'Human handoff', body: 'Ada opens a ticket and a person calls you back.', tone: 'conf3' as const },
];

const confBg = ['bg-[var(--conf-0)]', 'bg-[var(--conf-1)]', 'bg-[var(--conf-2)]', 'bg-[var(--conf-3)]'];

export default function Landing() {
  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <div className="relative overflow-hidden bg-ink">
        <AdirePattern opacity={0.28} id="adire-hero" />
        <Nav />
        <main id="main">
          <section className="relative isolate mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-6 sm:pt-14 lg:pb-28" aria-labelledby="hero-title">
            {/* floating packages and blocks */}
            <BlockCluster variant="a" className="pointer-events-none absolute -right-10 top-0 hidden w-52 opacity-90 lg:block" />
            <Package size={108} tilt={8} delay={0} shadow="var(--ss-teal)" className="pointer-events-none absolute right-[3%] top-6 hidden lg:block" />
            <Package size={70} tilt={-14} delay={1.3} shadow="var(--ss-teal)" className="pointer-events-none absolute right-[27%] top-0 hidden xl:block" />
            <Package size={56} tilt={20} delay={0.6} shadow="var(--ss-teal)" className="pointer-events-none absolute right-2 top-2 lg:hidden" />

            <Chip tone="ink" className="anim-pop mb-6">
              <span className="h-2 w-2 rounded-full bg-magenta" aria-hidden="true" /> English + Pidgin voice agent
            </Chip>

            <div id="hero-title">
              <SlicedHeadline
                text="Customer care wey sabi when you no understand."
                highlight="sabi"
                className="max-w-[16ch] text-[clamp(2rem,5vw,4rem)]"
              />
            </div>

            <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-lg text-white/85 sm:text-xl">
                  Ada is a voice agent that speaks English and Pidgin, and changes how she explains things when you're lost.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button to="/call" size="lg" icon={<MicIcon className="h-5 w-5" />}>Talk to Ada</Button>
                  <Button to="/dashboard" size="lg" variant="secondary">See the dashboard</Button>
                </div>
              </div>

              <div className="relative flex items-end gap-2 self-center md:self-auto">
                <Package size={92} tilt={-22} delay={2} shadow="var(--ss-teal)" className="pointer-events-none -mr-6 hidden sm:block" />
                <SpinningBadge size={176} />
              </div>
            </div>
          </section>

          {/* ---------------- Try these orders ---------------- */}
          <section className="relative border-t-2 border-ink bg-forest" aria-labelledby="try-title">
            <AdirePattern opacity={0.18} id="adire-try" />
            <div className="relative mx-auto max-w-[1240px] px-4 py-14 sm:px-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="label text-mint">Try these orders</p>
                  <h2 id="try-title" className="mt-2 text-[clamp(1.5rem,3.5vw,2rem)] font-extrabold text-white">
                    Pick an order, then talk am.
                  </h2>
                </div>
                <p className="max-w-sm text-[15px] text-white/75">
                  Say the first line. Then say the second one like you're lost, and watch Ada change gear.
                </p>
              </div>

              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {TRY_ORDERS.map((o, i) => (
                  <li key={o.id} className="anim-pop" style={{ animationDelay: `${120 + i * 80}ms` }}>
                    <Link
                      to={`/call?order=${o.id}`}
                      className="press group flex h-full flex-col rounded-[var(--radius-md)] bg-cream p-5 text-ink"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-lg font-bold whitespace-nowrap">{o.id}</span>
                        <Chip tone={o.tone}>{o.status}</Chip>
                      </div>
                      <ol className="mt-4 space-y-2 text-[15px]">
                        {o.lines.map((line, n) => (
                          <li key={line} className="flex gap-2">
                            <span className="font-mono text-[13px] font-bold text-teal">{n + 1}.</span>
                            <span>"{line}"</span>
                          </li>
                        ))}
                      </ol>
                      <span className="mt-auto pt-5 text-[13px] font-bold underline decoration-2 underline-offset-4 group-hover:decoration-green">
                        Call with this order
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Ribbons />

          {/* ---------------- How Ada notices confusion ---------------- */}
          <section id="how" className="relative scroll-mt-4 overflow-hidden bg-cream" aria-labelledby="how-title">
            <BlockCluster variant="b" className="pointer-events-none absolute -left-6 -top-2 hidden w-40 md:block" />
            <div className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:py-28">
              <div className="mx-auto max-w-2xl text-center">
                <p className="label text-teal">How it works</p>
                <h2 id="how-title" className="mt-3 text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold text-forest">
                  How Ada notices confusion
                </h2>
                <p className="mt-4 text-lg text-ink/75">
                  Most bots notice anger. Ada listens for the quieter signal: when you no follow.
                </p>
              </div>

              <div className="mt-14 grid gap-6 md:grid-cols-3">
                <Card className="p-7">
                  <StepIcon kind="listen" />
                  <h3 className="mt-5 text-[22px] font-extrabold">Listens</h3>
                  <p className="mt-2 text-ink/75">Hears Pidgin and English the way people really talk.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Chip tone="cream">"Wetin you talk?"</Chip>
                    <Chip tone="cream">"I no get am"</Chip>
                  </div>
                </Card>
                <Card className="p-7">
                  <StepIcon kind="notice" />
                  <h3 className="mt-5 text-[22px] font-extrabold">Notices</h3>
                  <p className="mt-2 text-ink/75">Catches repeats, long pauses and short unsure replies, and scores each turn 0 to 3.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Chip tone="cream">Asked again</Chip>
                    <Chip tone="cream">Long pause</Chip>
                    <Chip tone="cream">"Okay..?"</Chip>
                  </div>
                </Card>
                <Card className="p-7">
                  <StepIcon kind="adapt" />
                  <h3 className="mt-5 text-[22px] font-extrabold">Adapts</h3>
                  <p className="mt-2 text-ink/75">Climbs the explanation ladder: smaller steps, then a Naija analogy, then a human.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Chip tone="cream">"You dey follow?"</Chip>
                  </div>
                </Card>
              </div>

              {/* the ladder, as a staircase */}
              <div className="mt-20">
                <h3 className="text-center text-[22px] font-extrabold text-forest">The explanation ladder</h3>
                <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  {LADDER.map((step) => (
                    <li
                      key={step.level}
                      className="lg:[margin-bottom:var(--rise)]"
                      style={{ ['--rise' as string]: `${step.level * 40}px` }}
                    >
                      <div className="overflow-hidden rounded-[var(--radius-md)] border-2 border-ink bg-white text-ink shadow-[var(--shadow-hard)]">
                        <div className={`border-b-2 border-ink px-5 pb-4 pt-5 ${confBg[step.level]}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-2xl font-bold">L{step.level}</span>
                            {step.level === 3 ? <HumanIcon /> : <Stairs level={step.level} />}
                          </div>
                          <p className="font-display mt-5 text-xl font-extrabold">{step.title}</p>
                        </div>
                        <p className="px-5 py-4 text-[15px] text-ink/80">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mx-auto mt-8 max-w-xl text-center text-[15px] text-ink/70">
                  Confusion is a signal, not an error. Each level has its own colour, and you'll see the same colours on the live call and the dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- Under the hood ---------------- */}
          <section className="relative overflow-hidden border-t-2 border-ink bg-forest text-white" aria-labelledby="hood-title">
            <AdirePattern opacity={0.16} id="adire-hood" />
            <div className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
              <p className="label text-mint">Under the hood</p>
              <h2 id="hood-title" className="mt-3 text-[clamp(1.6rem,3.5vw,2rem)] font-extrabold">Four parts, one call.</h2>

              <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'Vapi', role: 'Hears you, thinks, speaks back with a Nigerian voice.', icon: 'wave' as const },
                  { name: 'Express', role: 'Runs the tools: check order, log confusion, escalate.', icon: 'server' as const },
                  { name: 'Supabase', role: 'Keeps orders, calls, turns and escalations.', icon: 'db' as const },
                  { name: 'n8n', role: 'Sends the WhatsApp or email alert when Ada calls a human.', icon: 'bell' as const },
                ].map((p, i) => (
                  <li key={p.name} className="relative">
                    <Card tone="teal" className="h-full p-6">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-mint text-ink">
                          <HoodIcon kind={p.icon} />
                        </span>
                        <span className="font-mono text-[13px] text-mint">0{i + 1}</span>
                      </div>
                      <p className="font-display mt-4 text-xl font-extrabold">{p.name}</p>
                      <p className="mt-1.5 text-[15px] text-white/80">{p.role}</p>
                    </Card>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
}

/* ---------------- Small icons drawn for this page ---------------- */
function StepIcon({ kind }: { kind: 'listen' | 'notice' | 'adapt' }) {
  const bg = { listen: 'bg-green', notice: 'bg-yellow', adapt: 'bg-mint' }[kind];
  return (
    <span className={`grid h-14 w-14 place-items-center rounded-[var(--radius-sm)] border-2 border-ink ${bg}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'listen' && <path d="M4 12h2M8 8v8M12 5v14M16 9v6M20 11v2" />}
        {kind === 'notice' && (
          <>
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.5-4.5M11 8.5v3M11 14h.01" />
          </>
        )}
        {kind === 'adapt' && <path d="M4 20h4v-4h4v-4h4V8h4" />}
      </svg>
    </span>
  );
}

function Stairs({ level }: { level: number }) {
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className={`w-2 rounded-sm border-[1.5px] border-ink ${n <= level ? 'bg-ink' : 'bg-transparent'}`} style={{ height: 6 + n * 5 }} />
      ))}
    </span>
  );
}

function HumanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function HoodIcon({ kind }: { kind: 'wave' | 'server' | 'db' | 'bell' }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'wave' && <path d="M3 12h2M7 8v8M11 4v16M15 8v8M19 11v2" />}
      {kind === 'server' && (
        <>
          <rect x="4" y="4" width="16" height="7" rx="2" />
          <rect x="4" y="13" width="16" height="7" rx="2" />
          <path d="M8 7.5h.01M8 16.5h.01" />
        </>
      )}
      {kind === 'db' && (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </>
      )}
      {kind === 'bell' && <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4" />}
    </svg>
  );
}
