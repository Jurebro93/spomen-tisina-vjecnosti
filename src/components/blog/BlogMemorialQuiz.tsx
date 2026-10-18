import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Flame, Heart, ImageIcon, Music, Share2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recordBlogClick, setMemorialPrefill, trackBlog } from '@/lib/blogTracking';
import { EXAMPLE_PATH } from '@/components/promo/MemorialValueSummary';

type Option = { id: string; label: string };

const RELATIONS: (Option & { noun: string })[] = [
  { id: 'roditelj', label: 'Majku ili oca', noun: 'roditelja' },
  { id: 'suprug', label: 'Supruga ili suprugu', noun: 'supružnika' },
  { id: 'baka_djed', label: 'Baku ili djeda', noun: 'baku ili djeda' },
  { id: 'dijete', label: 'Dijete', noun: 'dijete' },
  { id: 'drugo', label: 'Prijatelja ili nekog drugog', noun: 'voljenu osobu' },
];

const PRIORITIES: (Option & { short: string })[] = [
  { id: 'fotografije', label: 'Fotografije iz obiteljskih albuma', short: 'Fotografije' },
  { id: 'prica', label: 'Životnu priču i važne trenutke', short: 'Životna priča' },
  { id: 'poruke', label: 'Molitve, svijeće i poruke bližnjih', short: 'Molitve' },
  { id: 'pjesma', label: 'Omiljenu pjesmu i male uspomene', short: 'Glazba' },
];

const DISTANCES: Option[] = [
  { id: 'blizu', label: 'Svi smo u istom mjestu' },
  { id: 'grad', label: 'Neki žive u drugom gradu' },
  { id: 'inozemstvo', label: 'Neki žive u inozemstvu' },
];

const QUESTIONS = [
  { q: 'Čiju uspomenu želite sačuvati?', options: RELATIONS },
  { q: 'Što vam je najvažnije da ne padne u zaborav?', options: PRIORITIES },
  { q: 'Gdje žive članovi obitelji i prijatelji?', options: DISTANCES },
];

const PRIORITY_ICON: Record<string, typeof ImageIcon> = { fotografije: ImageIcon, prica: BookOpen, poruke: Flame, pjesma: Music };

const DISTANCE_TEXT: Record<string, string> = {
  blizu: 'Memorijal ostaje mjesto na koje se obitelj može vratiti na godišnjice i blagdane.',
  grad: 'Rodbina iz drugih gradova može zapaliti svijeću i ostaviti poruku kad god poželi.',
  inozemstvo: 'Bližnji u inozemstvu dobivaju poveznicu i mogu sudjelovati u sjećanju kao da su tu.',
};

/** Visual mock of a finished memorial, so readers see what they would create. */
export const MemorialPreview = ({ name, priority }: { name?: string; priority?: string }) => {
  const chips = PRIORITIES.map((p) => ({ ...p, Icon: PRIORITY_ICON[p.id], active: p.id === priority }));
  return (
    <div aria-hidden="true" className="rounded-lg border border-border bg-background shadow-md overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-memorial-gold/30 via-memorial-gold/10 to-memorial-gold/30" />
      <div className="px-5 pb-5 -mt-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-full border-4 border-background bg-muted flex items-center justify-center">
          <User className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-2 font-serif text-lg text-foreground">{name?.trim() || 'Ime i prezime'}</p>
        <p className="text-xs text-muted-foreground">Zauvijek u našim srcima</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          {chips.map(({ id, short, Icon, active }) => (
            <div key={id} className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${active ? 'border-memorial-gold bg-memorial-gold/10 text-foreground' : 'border-border text-muted-foreground'}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{short}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-memorial-gold" />Svijeće</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-memorial-gold" />Poruke</span>
          <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5 text-memorial-gold" />Poveznica i QR kod</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Three-question quiz shown inside the article; ends with a personalised memorial preview and a CTA.
 * Each answer is logged as an `interactive` blog event (cta_id quiz_q<n>_<answer>) so answer mix is visible in admin.
 */
const BlogMemorialQuiz = ({ slug, heading }: { slug: string; heading?: string | null }) => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const step = answers.length;
  const done = step >= QUESTIONS.length;

  const answer = (id: string) => {
    trackBlog('interactive', slug, `quiz_q${step + 1}_${id}`);
    if (step + 1 === QUESTIONS.length) trackBlog('interactive', slug, 'quiz_complete');
    setAnswers([...answers, id]);
  };

  const create = () => {
    if (name.trim()) setMemorialPrefill({ name: name.trim().slice(0, 100) });
    recordBlogClick(slug, name.trim() ? 'quiz_create_name' : 'quiz_create');
    navigate('/digitalni-memorijal/kreiraj');
  };

  const relation = RELATIONS.find((r) => r.id === answers[0]);
  const priority = PRIORITIES.find((p) => p.id === answers[1]);

  return (
    <section aria-labelledby={`quiz-${slug}`} className="not-prose my-10 rounded-lg border border-memorial-gold/60 bg-card p-5 md:p-7">
      <p className="text-xs uppercase tracking-wider font-semibold text-memorial-gold mb-1">Digitalni memorijal · 3 kratka pitanja</p>
      <h2 id={`quiz-${slug}`} className="font-serif text-xl md:text-2xl text-foreground mb-4">
        {heading || 'Kako bi izgledao memorijal vaše voljene osobe?'}
      </h2>

      {!done ? (
        <div>
          <div className="flex gap-1.5 mb-4" aria-hidden="true">
            {QUESTIONS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-memorial-gold' : 'bg-border'}`} />)}
          </div>
          <p className="font-medium text-foreground mb-3">{QUESTIONS[step].q}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUESTIONS[step].options.map((o) => (
              <button key={o.id} type="button" onClick={() => answer(o.id)}
                className="text-left rounded-md border border-border p-3 text-sm text-foreground transition-colors hover:border-memorial-gold hover:bg-muted">
                {o.label}
              </button>
            ))}
          </div>
          {step > 0 && (
            <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="mt-3 text-xs text-muted-foreground underline">
              Natrag
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <MemorialPreview name={name} priority={answers[1]} />
          <div>
            <p className="text-foreground leading-relaxed mb-2">
              Za {relation?.noun ?? 'voljenu osobu'} možete napraviti mirnu stranicu na kojoj je na prvom mjestu
              {' '}{(priority?.label ?? 'ono što vam je važno').toLowerCase()}.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">{DISTANCE_TEXT[answers[2]]} Izradu možete započeti odmah, bez registracije.</p>
            <Input value={name} maxLength={100} placeholder="Ime i prezime (neobavezno)" aria-label="Ime i prezime voljene osobe"
              onChange={(e) => setName(e.target.value)} className="h-11 text-base mb-3" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" onClick={create} className="h-11 bg-memorial-gold text-memorial-gold-foreground hover:bg-memorial-gold/90">
                Kreiraj memorijal <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <a href={EXAMPLE_PATH} target="_blank" rel="noopener" onClick={() => recordBlogClick(slug, 'quiz_example', 'link_click')}
                className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm text-foreground hover:bg-muted">
                Pogledajte primjer
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BlogMemorialQuiz;
