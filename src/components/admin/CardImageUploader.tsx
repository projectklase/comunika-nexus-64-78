import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Upload } from 'lucide-react';

// Importar imagens
import FibonacciImg from '@/assets/card-uploads/Fibonacci_Espiral_EPIC.png';
import GaussImg from '@/assets/card-uploads/Gauss_Dimensional_LEGENDARY.png';
import DarwinImg from '@/assets/card-uploads/Darwin_Evolucionario_LEGENDARY.png';
import VulcaoImg from '@/assets/card-uploads/Vulcao_Adormecido_RARE.png';
import BuracoNegroImg from '@/assets/card-uploads/Buraco_Negro_RARE.png';
import MarieCurieImg from '@/assets/card-uploads/Marie_Curie_Radiante_EPIC.png';

const CARDS_TO_UPLOAD = [
  { id: '0d5a56c9-6c28-4d20-b67a-02a0376b51c8', name: 'Fibonacci Espiral', imgSrc: FibonacciImg },
  { id: '0744675f-0c3c-494c-a6c2-8a44dbe87116', name: 'Gauss Dimensional', imgSrc: GaussImg },
  { id: 'ad768ba0-9758-40b7-8128-8d3e14411d05', name: 'Darwin Evolucionário', imgSrc: DarwinImg },
  { id: '8d132765-8d56-416f-a347-c44857c769b8', name: 'Vulcão Adormecido', imgSrc: VulcaoImg },
  { id: '82c2fddc-60df-42af-8800-33d35b36ef18', name: 'Buraco Negro', imgSrc: BuracoNegroImg },
  { id: '24eabebd-177e-4d09-a3b2-8ec95c62b5f8', name: 'Marie Curie Radiante', imgSrc: MarieCurieImg },
];

async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function CardImageUploader() {
  const [uploading, setUploading] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  const uploadCard = async (card: typeof CARDS_TO_UPLOAD[0]) => {
    setUploading(card.id);
    try {
      console.log(`Convertendo ${card.name} para base64...`);
      const base64 = await imageUrlToBase64(card.imgSrc);
      
      console.log(`Enviando ${card.name} para edge function...`);
      const { data, error } = await supabase.functions.invoke('upload-card-image', {
        body: {
          card_id: card.id,
          image_base64: base64,
          filename: `${card.name}.png`
        }
      });

      if (error) throw error;
      
      console.log(`Upload concluído:`, data);
      setCompleted(prev => [...prev, card.id]);
      toast.success(`${card.name} enviado com sucesso!`);
    } catch (err) {
      console.error(`Erro ao enviar ${card.name}:`, err);
      toast.error(`Erro ao enviar ${card.name}`);
    } finally {
      setUploading(null);
    }
  };

  const uploadAll = async () => {
    for (const card of CARDS_TO_UPLOAD) {
      if (!completed.includes(card.id)) {
        await uploadCard(card);
      }
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Imagens de Cartas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={uploadAll} disabled={!!uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Todas as Imagens'
          )}
        </Button>

        <div className="grid gap-3">
          {CARDS_TO_UPLOAD.map(card => (
            <div 
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <img 
                src={card.imgSrc} 
                alt={card.name}
                className="w-12 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-medium">{card.name}</p>
                <p className="text-xs text-muted-foreground">{card.id}</p>
              </div>
              {completed.includes(card.id) ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : uploading === card.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => uploadCard(card)}
                  disabled={!!uploading}
                >
                  Enviar
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
