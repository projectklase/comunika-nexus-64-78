import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Check, Loader2 } from 'lucide-react';

// Import card images
import AlexandreImg from '@/assets/cards/historia/Alexandre_o_Grande_LEGENDARY.png';
import CleopatraImg from '@/assets/cards/historia/Cleopatra_Encantadora_EPIC.png';
import GladiadorImg from '@/assets/cards/historia/Gladiador_Romano_RARE.png';
import VikingImg from '@/assets/cards/historia/Viking_Berserker_RARE.png';
import MoedaImg from '@/assets/cards/historia/Moeda_Antiga_COMMON.png';
import VasoImg from '@/assets/cards/historia/Vaso_Grego_COMMON.png';

interface CardToUpload {
  name: string;
  cardId: string;
  imageUrl: string;
  fileName: string;
}

const CARDS_TO_UPLOAD: CardToUpload[] = [
  { name: 'Alexandre o Grande', cardId: '5752fc7b-a2b6-48d5-8e53-b44b2b3c9a1f', imageUrl: AlexandreImg, fileName: 'Alexandre_o_Grande_LEGENDARY.png' },
  { name: 'Cleópatra Encantadora', cardId: '4f8b7272-c3d4-4e5f-9a1b-2c3d4e5f6a7b', imageUrl: CleopatraImg, fileName: 'Cleopatra_Encantadora_EPIC.png' },
  { name: 'Gladiador Romano', cardId: '0c377c1b-d4e5-4f6a-8b9c-0d1e2f3a4b5c', imageUrl: GladiadorImg, fileName: 'Gladiador_Romano_RARE.png' },
  { name: 'Viking Berserker', cardId: 'b14bb1c5-e5f6-4a7b-9c0d-1e2f3a4b5c6d', imageUrl: VikingImg, fileName: 'Viking_Berserker_RARE.png' },
  { name: 'Moeda Antiga', cardId: 'abf50836-f6a7-4b8c-0d1e-2f3a4b5c6d7e', imageUrl: MoedaImg, fileName: 'Moeda_Antiga_COMMON.png' },
  { name: 'Vaso Grego', cardId: '32a1f165-a7b8-4c9d-1e2f-3a4b5c6d7e8f', imageUrl: VasoImg, fileName: 'Vaso_Grego_COMMON.png' },
];

export function CardImageUploader() {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());

  const uploadCard = async (card: CardToUpload) => {
    setUploading(card.cardId);
    
    try {
      // Fetch the image as blob
      const response = await fetch(card.imageUrl);
      const blob = await response.blob();
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64 = await base64Promise;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('upload-card-image', {
        body: {
          card_id: card.cardId,
          image_base64: base64,
          file_name: card.fileName,
        },
      });

      if (error) throw error;

      toast.success(`Imagem de "${card.name}" enviada com sucesso!`);
      setUploaded(prev => new Set(prev).add(card.cardId));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erro ao enviar imagem de "${card.name}"`);
    } finally {
      setUploading(null);
    }
  };

  const uploadAll = async () => {
    for (const card of CARDS_TO_UPLOAD) {
      if (!uploaded.has(card.cardId)) {
        await uploadCard(card);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Imagens - Cartas de História
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={uploadAll} 
          disabled={uploading !== null}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Todas as Imagens
            </>
          )}
        </Button>
        
        <div className="grid gap-2">
          {CARDS_TO_UPLOAD.map((card) => (
            <div 
              key={card.cardId} 
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={card.imageUrl} 
                  alt={card.name} 
                  className="w-10 h-14 object-cover rounded"
                />
                <span className="font-medium">{card.name}</span>
              </div>
              
              {uploaded.has(card.cardId) ? (
                <div className="flex items-center gap-1 text-green-500">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Enviado</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => uploadCard(card)}
                  disabled={uploading !== null}
                >
                  {uploading === card.cardId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
