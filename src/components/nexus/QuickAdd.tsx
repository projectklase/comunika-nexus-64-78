import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Simple heuristic parser for natural input
interface ParsedInput {
  title: string;
  date?: string;
  time?: string;
  turma?: string;
  peso?: number;
  type?: 'ATIVIDADE' | 'TRABALHO' | 'PROVA';
}

const parseNaturalInput = (input: string): ParsedInput => {
  const result: ParsedInput = { title: input };
  
  // Extract date patterns (DD/MM, DD/MM/YY, DD/MM/YYYY)
  const dateMatch = input.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3] ? 
      (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : 
      new Date().getFullYear().toString();
    result.date = `${year}-${month}-${day}`;
    result.title = result.title.replace(dateMatch[0], '').trim();
  }
  
  // Extract time patterns (HH:mm, HHh, HH)
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2})|h)?(?:\s*(am|pm))?/i);
  if (timeMatch && !dateMatch?.includes(timeMatch[0])) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      result.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      result.title = result.title.replace(timeMatch[0], '').trim();
    }
  }
  
  // Extract turma patterns (turma X, classe X, sala X)
  const turmaMatch = input.match(/(?:turma|classe|sala)\s*([a-zA-Z0-9]+)/i);
  if (turmaMatch) {
    result.turma = turmaMatch[1].toUpperCase();
    result.title = result.title.replace(turmaMatch[0], '').trim();
  }
  
  // Extract peso patterns (peso X, vale X)
  const pesoMatch = input.match(/(?:peso|vale)\s*(\d+(?:\.\d+)?)/i);
  if (pesoMatch) {
    result.peso = parseFloat(pesoMatch[1]);
    result.title = result.title.replace(pesoMatch[0], '').trim();
  }
  
  // Determine type based on keywords
  const lowerTitle = result.title.toLowerCase();
  if (lowerTitle.includes('prova') || lowerTitle.includes('exame') || lowerTitle.includes('teste')) {
    result.type = 'PROVA';
  } else if (lowerTitle.includes('trabalho') || lowerTitle.includes('projeto') || lowerTitle.includes('tcc')) {
    result.type = 'TRABALHO';
  } else {
    result.type = 'ATIVIDADE';
  }
  
  return result;
};

export function QuickAdd() {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [parsed, setParsed] = useState<ParsedInput | null>(null);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.trim()) {
      setParsed(parseNaturalInput(value));
    } else {
      setParsed(null);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    const parsedInput = parseNaturalInput(input);
    
    // Mock implementation - in real app, this would create a post/activity
    toast({
      title: 'Atividade criada via QuickAdd',
      description: `"${parsedInput.title}" foi interpretada e criada com sucesso`
    });
    
    console.log('QuickAdd parsed:', parsedInput);
    
    setInput('');
    setParsed(null);
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setInput('');
      setParsed(null);
    }
  };

  return (
    <div className="relative">
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="glass-card"
        >
          <Plus className="h-4 w-4 mr-2" />
          QuickAdd
        </Button>
      ) : (
        <Card className="glass-card border-primary/30 w-80">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">QuickAdd</span>
            </div>
            
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="prova de inglês 10/09 10h turma 7A peso 2"
              className="text-sm"
              autoFocus
            />
            
            {parsed && input.trim() && (
              <div className="text-xs space-y-1 p-2 bg-muted/20 rounded-md">
                <div className="font-medium text-foreground">
                  📝 {parsed.title}
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsed.type && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      {parsed.type}
                    </span>
                  )}
                  {parsed.date && (
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary-foreground rounded text-xs">
                      📅 {new Date(parsed.date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                  {parsed.time && (
                    <span className="px-2 py-0.5 bg-accent/10 text-accent-foreground rounded text-xs">
                      🕐 {parsed.time}
                    </span>
                  )}
                  {parsed.turma && (
                    <span className="px-2 py-0.5 bg-muted/20 text-muted-foreground rounded text-xs">
                      🏫 {parsed.turma}
                    </span>
                  )}
                  {parsed.peso && (
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 rounded text-xs">
                      ⚖️ {parsed.peso}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                size="sm"
                disabled={!input.trim()}
                className="flex-1"
              >
                Criar
              </Button>
              <Button
                onClick={() => {
                  setIsExpanded(false);
                  setInput('');
                  setParsed(null);
                }}
                variant="ghost"
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}