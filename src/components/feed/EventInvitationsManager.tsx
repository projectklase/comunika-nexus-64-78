import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface Invitation {
  id: string;
  friendName: string;
  parentName: string;
  parentContact: string;
  createdAt: string;
  invitingStudentName: string;
}

interface EventInvitationsManagerProps {
  eventId: string;
  eventTitle: string;
}

export function EventInvitationsManager({ eventId, eventTitle }: EventInvitationsManagerProps) {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, [eventId]);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          id,
          friend_name,
          parent_name,
          parent_contact,
          created_at,
          inviting_student:profiles!event_invitations_inviting_student_id_fkey(name)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: Invitation[] = (data || []).map(item => ({
        id: item.id,
        friendName: item.friend_name,
        parentName: item.parent_name,
        parentContact: item.parent_contact,
        createdAt: item.created_at,
        invitingStudentName: (item.inviting_student as any)?.name || 'Desconhecido',
      }));

      setInvitations(formattedData);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      toast({
        title: 'Erro ao carregar convites',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (invitations.length === 0) {
      toast({
        title: 'Nenhum convite para exportar',
        description: 'Este evento ainda não possui convites de amigos.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Preparar dados para Excel
      const excelData = invitations.map(inv => ({
        'Nome do Amigo': inv.friendName,
        'Nome do Responsável': inv.parentName,
        'Contato do Responsável': inv.parentContact,
        'Convidado por': inv.invitingStudentName,
        'Data do Convite': format(new Date(inv.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      }));

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Convites');

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 25 }, // Nome do Amigo
        { wch: 25 }, // Nome do Responsável
        { wch: 30 }, // Contato
        { wch: 25 }, // Convidado por
        { wch: 20 }, // Data
      ];
      ws['!cols'] = colWidths;

      // Gerar e baixar arquivo
      const fileName = `convites_${eventTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Exportação concluída!',
        description: `Arquivo "${fileName}" foi baixado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Ocorreu um erro ao gerar o arquivo Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Amigos Convidados
            </CardTitle>
            <CardDescription>
              Leads capturados através de convites de alunos para "{eventTitle}"
            </CardDescription>
          </div>
          <Button
            onClick={handleExportToExcel}
            disabled={isExporting || invitations.length === 0}
            variant="outline"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar para Excel
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum amigo foi convidado para este evento ainda.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Quando alunos convidarem amigos, os dados aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                Total: {invitations.length} {invitations.length === 1 ? 'convite' : 'convites'}
              </Badge>
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Amigo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Convidado por</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.friendName}</TableCell>
                      <TableCell>{inv.parentName}</TableCell>
                      <TableCell>{inv.parentContact}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.invitingStudentName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(inv.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
