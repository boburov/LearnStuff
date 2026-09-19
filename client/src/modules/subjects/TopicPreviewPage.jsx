import { Link, useParams } from 'react-router-dom';
import { GridBackground, PixelButton, PixelCard, PixelSprite, PixelTag } from '@/shared/components/ui/pixel';
import Icon from '@/shared/components/Icon';
import { getSubject, getTopic } from './subjects';
import NotFoundPage from '../layout/NotFoundPage';

export default function TopicPreviewPage() {
  const { subject: slug, topic: topicSlug } = useParams();
  const subject = getSubject(slug);
  const topic = getTopic(slug, topicSlug);
  if (!subject || !topic) return <NotFoundPage />;
  return (
    <div className="relative isolate min-h-[65vh] overflow-hidden">
      <GridBackground fade="bottom" />
      <div className="container py-10 md:py-16">
        <Link to={`/${subject.slug}`} className="inline-flex items-center gap-2 font-pixel text-muted-foreground hover:text-primary">
          <PixelSprite name="arrowDown" size={12} className="rotate-90" />{subject.title} mavzulari
        </Link>
        <PixelCard className="mx-auto mt-8 max-w-2xl p-6 md:p-10">
          <PixelTag>Tez kunda</PixelTag>
          <span className="mt-8 grid size-16 place-items-center border-2 border-pixel-ink bg-secondary"><Icon name={topic.icon} size={32} /></span>
          <h1 className="mt-5 font-pixel text-4xl font-bold md:text-5xl">{topic.title}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{topic.short}</p>
          <p className="mt-6 border-t-2 border-dashed border-border pt-6 text-sm leading-relaxed text-muted-foreground">Bu mavzu uchun darslar hali qo'shilmagan. Hozircha boshqa fanlar va mavzular bilan tanishishingiz mumkin.</p>
          <PixelButton to={`/${subject.slug}`} className="mt-8">Mavzularga qaytish</PixelButton>
        </PixelCard>
      </div>
    </div>
  );
}
