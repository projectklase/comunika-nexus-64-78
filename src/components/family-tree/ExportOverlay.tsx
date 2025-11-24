import { Heart, Users, UserCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOverlayProps {
  schoolName: string;
  totalFamilies: number;
  totalStudents: number;
  totalGuardians: number;
  exportDate: Date;
  children: React.ReactNode;
}

export function ExportOverlay({
  schoolName,
  totalFamilies,
  totalStudents,
  totalGuardians,
  exportDate,
  children,
}: ExportOverlayProps) {
  return (
    <div className="w-[3508px] h-[2480px] bg-gradient-to-br from-white via-gray-50 to-gray-100 p-[40px] flex flex-col">
      {/* 🎨 HEADER PROFISSIONAL COM ESPAÇO PARA LOGO */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-200">
        <div className="flex items-center gap-6">
          {/* ========================================
              🎨 LOGO DA ESCOLA - SUBSTITUIR AQUI
              ========================================
              Para adicionar o logo da escola:
              1. Substitua o <div> abaixo por <img>
              2. Exemplo: <img src="/logo-escola.png" alt={schoolName} className="w-32 h-32 object-contain" />
              3. Mantenha as dimensões (w-32 h-32) para proporção ideal
          ========================================== */}
          <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/30">
            <Heart className="w-16 h-16 text-primary" />
          </div>
          
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              Árvore Genealógica
            </h1>
            <p className="text-3xl text-gray-600 font-medium">
              {schoolName}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-2 text-2xl text-gray-600 mb-2">
            <Calendar className="w-6 h-6" />
            <span>{format(exportDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
          <div className="text-xl text-gray-500">
            {format(exportDate, 'HH:mm', { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* 📊 ESTATÍSTICAS RÁPIDAS */}
      <div className="flex gap-6 mb-8">
        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-violet-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
              <Heart className="w-6 h-6 text-violet-600" />
            </div>
            <span className="text-2xl font-semibold text-gray-700">Famílias</span>
          </div>
          <div className="text-5xl font-bold text-violet-600">{totalFamilies}</div>
        </div>

        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-2xl font-semibold text-gray-700">Alunos</span>
          </div>
          <div className="text-5xl font-bold text-indigo-600">{totalStudents}</div>
        </div>

        <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-rose-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-2xl font-semibold text-gray-700">Responsáveis</span>
          </div>
          <div className="text-5xl font-bold text-rose-600">{totalGuardians}</div>
        </div>
      </div>

      {/* 🌳 LEGENDA VISUAL INTEGRADA */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-8 border-2 border-gray-200 shadow-lg">
        <h3 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          Legenda de Relacionamentos
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-1 bg-violet-500 rounded-full"></div>
            <span className="text-xl text-gray-700 font-medium">Irmãos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-1 bg-orange-500 rounded-full border-2 border-dashed border-orange-300"></div>
            <span className="text-xl text-gray-700 font-medium">Primos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-1 bg-green-500 rounded-full"></div>
            <span className="text-xl text-gray-700 font-medium">Tios/Sobrinhos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-1 bg-blue-500 rounded-full border-2 border-dashed border-blue-300"></div>
            <span className="text-xl text-gray-700 font-medium">Padrinhos</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-1 bg-gray-400 rounded-full"></div>
            <span className="text-xl text-gray-700 font-medium">Outros</span>
          </div>
        </div>
      </div>

      {/* 🖼️ CONTEÚDO DA ÁRVORE */}
      <div className="flex-1 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {children}
      </div>

      {/* 📋 FOOTER PROFISSIONAL */}
      <div className="mt-8 pt-6 border-t-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* ========================================
              🎨 LOGO SECUNDÁRIO (FOOTER) - SUBSTITUIR AQUI
              ========================================
              Para adicionar logo menor no footer:
              1. Substitua o <div> abaixo por <img>
              2. Exemplo: <img src="/logo-escola.png" alt={schoolName} className="w-16 h-16 object-contain" />
              3. Dimensões menores (w-16 h-16) para footer discreto
          ========================================== */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
            <Heart className="w-8 h-8 text-primary/60" />
          </div>
          
          <div>
            <p className="text-xl font-semibold text-gray-800">{schoolName}</p>
            <p className="text-lg text-gray-500">Mapa de Relações Familiares</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-lg text-gray-600">
            Gerado pelo Sistema de Gestão Escolar
          </p>
          <p className="text-lg text-gray-500">
            Documento confidencial - Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
