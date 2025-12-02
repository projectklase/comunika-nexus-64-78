import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface CardMapping {
  cardId: string;
  cardName: string;
  fileName: string;
}

const CARD_MAPPINGS: CardMapping[] = [
  {
    cardId: '775dd543-5226-483e-af43-9a76324e3a84',
    cardName: 'Contra-Ataque',
    fileName: 'contra-ataque.png'
  },
  {
    cardId: '7044b01f-89e0-4619-9098-590bcb342b40',
    cardName: 'Emboscada',
    fileName: 'emboscada.png'
  },
  {
    cardId: 'fbe6c7a0-ec45-4666-a60f-00caefef7cfb',
    cardName: 'Escudo Mágico',
    fileName: 'escudo-magico.png'
  },
  {
    cardId: 'c211084d-aec5-4374-96e8-a4744a35ce0a',
    cardName: 'Roubo de Energia',
    fileName: 'roubo-de-energia.png'
  }
];

export function CardImageUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; error?: string }>>({});

  const fetchImageAsBase64 = async (fileName: string): Promise<string> => {
    const response = await fetch(`/card-images/${fileName}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const uploadAllImages = async () => {
    setIsUploading(true);
    setResults({});

    try {
      const images = [];
      
      for (const mapping of CARD_MAPPINGS) {
        try {
          const base64 = await fetchImageAsBase64(mapping.fileName);
          images.push({
            cardId: mapping.cardId,
            base64,
            mimeType: 'image/png'
          });
        } catch (err) {
          console.error(`Failed to fetch ${mapping.fileName}:`, err);
          setResults(prev => ({
            ...prev,
            [mapping.cardId]: { success: false, error: 'Failed to fetch image' }
          }));
        }
      }

      if (images.length === 0) {
        toast.error('Nenhuma imagem encontrada para upload');
        return;
      }

      const { data, error } = await supabase.functions.invoke('upload-card-images', {
        body: { images }
      });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Erro ao fazer upload das imagens');
        return;
      }

      // Process results
      const newResults: Record<string, { success: boolean; error?: string }> = {};
      for (const result of data.results || []) {
        newResults[result.cardId] = {
          success: result.success,
          error: result.error
        };
      }
      setResults(newResults);

      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      if (successCount === CARD_MAPPINGS.length) {
        toast.success(`✅ Todas as ${successCount} imagens foram enviadas com sucesso!`);
      } else {
        toast.warning(`${successCount}/${CARD_MAPPINGS.length} imagens enviadas`);
      }

    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao processar imagens');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload de Imagens das Cartas ESPECIAL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Este utilitário fará upload das 4 imagens das cartas ESPECIAL para o Supabase Storage
          e atualizará as URLs no banco de dados.
        </p>

        <div className="space-y-2">
          {CARD_MAPPINGS.map((mapping) => (
            <div 
              key={mapping.cardId}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={`/card-images/${mapping.fileName}`} 
                  alt={mapping.cardName}
                  className="w-12 h-12 object-cover rounded"
                />
                <span className="font-medium">{mapping.cardName}</span>
              </div>
              <div>
                {results[mapping.cardId]?.success === true && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {results[mapping.cardId]?.success === false && (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <Button 
          onClick={uploadAllImages} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload das 4 Imagens
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
