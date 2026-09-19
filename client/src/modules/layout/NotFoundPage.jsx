import { PixelButton, PixelSprite } from '@/shared/components/ui/pixel';
export default function NotFoundPage() {
  return <div className="container grid min-h-[65vh] place-items-center py-16 text-center"><div>
    <PixelSprite name="flag" size={56} className="mx-auto" />
    <p className="mt-6 font-pixel text-xl text-primary">404</p>
    <h1 className="mt-2 font-pixel text-4xl font-bold">Sahifa topilmadi</h1>
    <p className="mt-3 text-muted-foreground">Bu yo'nalish hali mavjud emas yoki manzil noto'g'ri.</p>
    <PixelButton to="/subjects" className="mt-8">Fanlarga qaytish</PixelButton>
  </div></div>;
}
