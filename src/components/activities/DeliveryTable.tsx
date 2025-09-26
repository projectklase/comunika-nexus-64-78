import { useState, useMemo } from 'react';
import { Delivery, ReviewStatus } from '@/types/delivery';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ReviewStatusBadge } from './DeliveryStatusBadge';
import { ApprovalModal } from './ApprovalModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { 
  Search, 
  Eye, 
  Download, 
  CheckCircle, 
  XCircle, 
  FileText,
  Filter,
  MoreHorizontal,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeliveryAttachment } from '@/types/delivery';

interface DeliveryTableProps {
  deliveries: Delivery[];
  activityTitle: string;
  onReview: (deliveryIds: string[], reviewStatus: ReviewStatus, reviewNote?: string) => void;
  onMarkAsReceived: (studentId: string, studentName: string) => void;
  isLoading?: boolean;
}

// Default filter tokens to avoid empty string values
const DEFAULT_FILTER_TOKENS = {
  ALL_STATUS: 'ALL_STATUS',
  ALL_DEADLINES: 'ALL_DEADLINES', 
  ALL_ATTACHMENTS: 'ALL_ATTACHMENTS'
} as const;

export function DeliveryTable({ 
  deliveries, 
  activityTitle, 
  onReview, 
  onMarkAsReceived,
  isLoading = false 
}: DeliveryTableProps) {
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(DEFAULT_FILTER_TOKENS.ALL_STATUS);
  const [lateFilter, setLateFilter] = useState<string>(DEFAULT_FILTER_TOKENS.ALL_DEADLINES);
  const [attachmentFilter, setAttachmentFilter] = useState<string>(DEFAULT_FILTER_TOKENS.ALL_ATTACHMENTS);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [reviewingDelivery, setReviewingDelivery] = useState<Delivery | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewingAttachment, setPreviewingAttachment] = useState<DeliveryAttachment | null>(null);

  // Filtrar entregas
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(delivery => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!delivery.studentName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Filtro de status
      if (statusFilter !== DEFAULT_FILTER_TOKENS.ALL_STATUS && delivery.reviewStatus !== statusFilter) {
        return false;
      }

      // Filtro de atraso
      if (lateFilter === 'late' && !delivery.isLate) {
        return false;
      }
      if (lateFilter === 'ontime' && delivery.isLate) {
        return false;
      }

      // Filtro de anexo
      if (attachmentFilter === 'with' && (!delivery.attachments || delivery.attachments.length === 0)) {
        return false;
      }
      if (attachmentFilter === 'without' && delivery.attachments && delivery.attachments.length > 0) {
        return false;
      }

      return true;
    });
  }, [deliveries, searchQuery, statusFilter, lateFilter, attachmentFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDeliveries(filteredDeliveries.map(d => d.id));
    } else {
      setSelectedDeliveries([]);
    }
  };

  const handleSelectDelivery = (deliveryId: string, checked: boolean) => {
    if (checked) {
      setSelectedDeliveries(prev => [...prev, deliveryId]);
    } else {
      setSelectedDeliveries(prev => prev.filter(id => id !== deliveryId));
    }
  };

  const handleSingleReview = (delivery: Delivery) => {
    setReviewingDelivery(delivery);
    setApprovalModalOpen(true);
  };

  const handleBulkReview = () => {
    if (selectedDeliveries.length === 0) return;
    setReviewingDelivery(null);
    setApprovalModalOpen(true);
  };

  const handleReviewSubmit = (reviewStatus: ReviewStatus, reviewNote?: string) => {
    if (reviewingDelivery) {
      // Revisão individual
      onReview([reviewingDelivery.id], reviewStatus, reviewNote);
    } else {
      // Revisão em lote
      onReview(selectedDeliveries, reviewStatus, reviewNote);
    }
    
    setSelectedDeliveries([]);
    setReviewingDelivery(null);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const handleAttachmentClick = (attachment: DeliveryAttachment) => {
    const isImage = attachment.type?.includes('image/') || 
      ['jpg', 'jpeg', 'png', 'webp'].some(ext => 
        attachment.name.toLowerCase().endsWith(`.${ext}`)
      );
    
    if (isImage && attachment.url) {
      setPreviewingAttachment(attachment);
      setPreviewModalOpen(true);
    } else if (attachment.url) {
      // Download non-image files
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const allSelected = filteredDeliveries.length > 0 && selectedDeliveries.length === filteredDeliveries.length;
  const someSelected = selectedDeliveries.length > 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por aluno..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_FILTER_TOKENS.ALL_STATUS}>Todos</SelectItem>
              <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
              <SelectItem value="APROVADA">Aprovadas</SelectItem>
              <SelectItem value="DEVOLVIDA">Devolvidas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={lateFilter} onValueChange={setLateFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_FILTER_TOKENS.ALL_DEADLINES}>Todos</SelectItem>
              <SelectItem value="late">Atrasadas</SelectItem>
              <SelectItem value="ontime">No prazo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={attachmentFilter} onValueChange={setAttachmentFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Anexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_FILTER_TOKENS.ALL_ATTACHMENTS}>Todos</SelectItem>
              <SelectItem value="with">Com anexo</SelectItem>
              <SelectItem value="without">Sem anexo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ações em lote */}
      {someSelected && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedDeliveries.length} entrega(s) selecionada(s)
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleBulkReview}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Revisar Selecionadas
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setSelectedDeliveries([])}
            >
              Limpar Seleção
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Entrega</TableHead>
              <TableHead>Anexos</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {deliveries.length === 0 
                    ? 'Nenhuma entrega encontrada'
                    : 'Nenhuma entrega corresponde aos filtros aplicados'
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDeliveries.includes(delivery.id)}
                      onCheckedChange={(checked) => handleSelectDelivery(delivery.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{delivery.studentName}</div>
                      {delivery.reviewedAt && (
                        <div className="text-sm text-muted-foreground">
                          Revisado em {format(new Date(delivery.reviewedAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ReviewStatusBadge 
                      reviewStatus={delivery.reviewStatus} 
                      isLate={delivery.isLate}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(delivery.submittedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                     {delivery.attachments && delivery.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {delivery.attachments.map((attachment, index) => {
                          const isImage = attachment.type?.includes('image/') || 
                            ['jpg', 'jpeg', 'png', 'webp'].some(ext => 
                              attachment.name.toLowerCase().endsWith(`.${ext}`)
                            );
                          
                          return (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="h-auto p-2 text-xs hover:bg-primary/10"
                              onClick={() => handleAttachmentClick(attachment)}
                            >
                              <div className="flex items-center gap-1">
                                {isImage ? (
                                  <ImageIcon className="h-3 w-3" />
                                ) : (
                                  <span>{getFileIcon(attachment.name)}</span>
                                )}
                                <span className="truncate max-w-[120px]">{attachment.name}</span>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem anexos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {delivery.reviewNote && (
                        <div className="text-sm p-2 bg-muted/50 rounded text-muted-foreground">
                          {delivery.reviewNote}
                        </div>
                      )}
                      {delivery.notes && (
                        <div className="text-sm text-muted-foreground italic mt-1">
                          "{delivery.notes}"
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSingleReview(delivery)}
                        disabled={isLoading}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {delivery.attachments && delivery.attachments.length > 0 && (
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => handleSingleReview(delivery)}
                            disabled={isLoading}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Revisar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onMarkAsReceived(delivery.studentId, delivery.studentName)}
                            disabled={isLoading}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Marcar como Recebida
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de aprovação */}
      <ApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        onSubmit={handleReviewSubmit}
        studentName={reviewingDelivery?.studentName || ''}
        activityTitle={activityTitle}
        mode={reviewingDelivery ? 'single' : 'multiple'}
        selectedCount={selectedDeliveries.length}
        isLoading={isLoading}
      />

      {/* Modal de preview de anexos */}
      <AttachmentPreviewModal
        attachment={previewingAttachment}
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setPreviewingAttachment(null);
        }}
      />
    </div>
  );
}