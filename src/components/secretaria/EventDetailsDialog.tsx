import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EventInvitationsTab } from '@/components/secretaria/EventInvitationsTab';
import { Post } from '@/types/post';
import { Info, Users, UserPlus, MapPin, Calendar, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEventMetrics } from '@/hooks/useEventMetrics';
import { useClasses } from '@/hooks/useClasses';

interface EventDetailsDialogProps {
  event: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailsDialog({ event, open, onOpenChange }: EventDetailsDialogProps) {
  const { data: metrics } = useEventMetrics(event?.id);
  const { classes } = useClasses();
  
  if (!event) return null;
  
  const eventDate = event.eventStartAt ? parseISO(event.eventStartAt) : null;
  const eventEndDate = event.eventEndAt ? parseISO(event.eventEndAt) : null;
  
  const eventClasses = event.classIds?.map(classId => 
    classes?.find(c => c.id === classId)
  ).filter(Boolean);
  
  const currentParticipants = event.eventCapacityType === 'GLOBAL' 
    ? (metrics?.confirmationsCount || 0) + (metrics?.invitationsCount || 0)
    : metrics?.invitationsCount || 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">{event.title}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Informações</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Gestão</span>
              <Badge variant="secondary" className="ml-1">
                {(metrics?.confirmationsCount || 0) + (metrics?.invitationsCount || 0)}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="info" className="space-y-4 mt-0">
              <Card className="glass-card">
                <CardContent className="pt-6 space-y-4">
                  {/* Data e Hora */}
                  {eventDate && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>Data e Horário</span>
                      </div>
                      <div className="ml-7 space-y-1">
                        <p className="text-foreground">
                          {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(eventDate, "HH:mm")}
                            {eventEndDate && ` - ${format(eventEndDate, "HH:mm")}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Local */}
                  {event.eventLocation && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span>Local</span>
                      </div>
                      <p className="ml-7 text-foreground">{event.eventLocation}</p>
                    </div>
                  )}
                  
                  {/* Descrição */}
                  {event.body && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Descrição</h3>
                      <p className="text-foreground whitespace-pre-wrap">{event.body}</p>
                    </div>
                  )}
                  
                  {/* Turmas */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Turmas</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.audience === 'GLOBAL' ? (
                        <Badge variant="outline" className="text-base">
                          Todas as Turmas (Global)
                        </Badge>
                      ) : eventClasses && eventClasses.length > 0 ? (
                        eventClasses.map((c: any) => (
                          <Badge key={c.id} variant="secondary" className="text-base">
                            {c.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Nenhuma turma específica</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Configurações */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Configurações</h3>
                    <div className="space-y-1 ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Permite convites de amigos:</span>
                        <Badge variant={event.allowInvitations ? "default" : "secondary"}>
                          {event.allowInvitations ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline">{event.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Autor:</span>
                        <span className="font-medium">{event.authorName}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="management" className="mt-0">
              <EventInvitationsTab eventId={event.id} eventTitle={event.title} />
            </TabsContent>
            
            <TabsContent value="stats" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Confirmações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold gradient-text">{metrics?.confirmationsCount || 0}</div>
                  </CardContent>
                </Card>
                
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Convites de Amigos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold gradient-text">{metrics?.invitationsCount || 0}</div>
                  </CardContent>
                </Card>

                {event.eventCapacityEnabled && (
                  <Card className="glass-card col-span-full">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Controle de Capacidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Tipo de Limite</div>
                        <Badge variant="outline" className="gap-1">
                          {event.eventCapacityType === 'GLOBAL' ? (
                            <><Users className="h-3 w-3" /> Limite Global</>
                          ) : (
                            <><UserPlus className="h-3 w-3" /> Limite por Aluno</>
                          )}
                        </Badge>
                      </div>

                      {event.eventCapacityType === 'GLOBAL' && (
                        <>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Ocupação</div>
                            <div className="text-2xl font-bold gradient-text">
                              {currentParticipants} / {event.eventMaxParticipants}
                            </div>
                          </div>
                          
                          <Progress 
                            value={(currentParticipants / (event.eventMaxParticipants || 1)) * 100} 
                            className="h-2"
                          />
                          
                          <div className="text-xs">
                            {(event.eventMaxParticipants || 0) - currentParticipants > 0 ? (
                              <span className="text-muted-foreground">
                                {(event.eventMaxParticipants || 0) - currentParticipants} vagas disponíveis
                              </span>
                            ) : (
                              <span className="text-red-400 font-medium">⚠️ Evento lotado</span>
                            )}
                          </div>
                        </>
                      )}

                      {event.eventCapacityType === 'PER_STUDENT' && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Limite por Aluno</div>
                          <div className="text-2xl font-bold gradient-text">
                            {event.eventMaxGuestsPerStudent} convidado(s)
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Total de convites: <strong>{metrics?.invitationsCount || 0}</strong>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
