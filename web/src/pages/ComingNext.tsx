import { Nav } from '../components/Chrome';
import { AdirePattern } from '../components/Decor';
import { Package } from '../components/Package';
import { Button } from '../components/ui';

/* Temporary screen while the live call view and dashboard are built. */
export default function ComingNext({ title, notFound = false }: { title: string; notFound?: boolean }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-forest text-white">
      <AdirePattern opacity={0.18} id="adire-next" />
      <Nav />
      <main id="main" className="relative mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <Package size={96} shadow="var(--ss-ink)" />
        <h1 className="mt-6 text-3xl font-extrabold">{title}</h1>
        <p className="mt-3 text-white/80">
          {notFound ? 'We no fit find this page. Abeg go back home.' : 'Ada dey come. This screen is next on the build list.'}
        </p>
        <Button to="/" className="mt-8">Back home</Button>
      </main>
    </div>
  );
}
