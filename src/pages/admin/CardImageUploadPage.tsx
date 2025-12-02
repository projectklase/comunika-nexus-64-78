import { CardImageUploader } from '@/components/admin/CardImageUploader';

export default function CardImageUploadPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Upload de Imagens de Cartas</h1>
        <CardImageUploader />
      </div>
    </div>
  );
}
