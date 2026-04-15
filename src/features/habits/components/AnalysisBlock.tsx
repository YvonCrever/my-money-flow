import type { HabitAnalysisData } from '@/features/habits/types';

/**
 * Bloc d'analyse à droite du tableau principal
 *
 * Affiche pour chaque habitude :
 * - Goal : nombre de jours du mois
 * - Actual : nombre de jours marqués "faite"
 * - Progress T : barre visuelle basée sur %T
 * - %T : pourcentage total
 * - Progress C : barre visuelle basée sur %C
 * - %C : pourcentage courant
 */

interface AnalysisBlockProps {
  habitAnalyses: HabitAnalysisData[];
}

/**
 * Barre de progression simple
 */
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div
      className="bg-white/10 overflow-hidden w-full"
      style={{
        height: '18px',
      }}
    >
      <div
        className="h-full bg-slate-400 transition-all"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

export function AnalysisBlock({ habitAnalyses }: AnalysisBlockProps) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '40px 40px 0.8fr 40px 0.8fr 40px',
    gap: '0',
    alignItems: 'center',
  };

  const cellStyle = {
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  };

  return (
    <div className="flex flex-col" style={{ minWidth: '20rem' }}>
      {/* En-tête "Analyse" — s'aligne avec les 2 premières lignes de la grille (W + DOW) */}
      <div className="h-[3.25rem] border-b border-white/8 flex items-center justify-center">
        <div className="text-xl font-bold text-slate-100">Analyse</div>
      </div>

      {/* En-tête des colonnes avec grille — s'aligne avec la ligne des numéros */}
      <div
        className="h-6 border-b border-white/8 bg-white/[0.02]"
        style={gridStyle}
      >
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full" style={cellStyle}>Goal</div>
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full" style={cellStyle}>Actual</div>
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full" style={cellStyle}>Progress</div>
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full" style={cellStyle}>%T</div>
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full" style={cellStyle}>Consistency</div>
        <div className="text-[12px] font-semibold text-slate-500 text-center flex items-center justify-center h-full">%C</div>
      </div>

      {/* Lignes d'habitudes avec grille — h-8 */}
      {habitAnalyses.map((analysis) => (
        <div
          key={`analysis-row-${analysis.habitId}`}
          className="h-8 border-b border-white/8 bg-white/[0.01] hover:bg-white/[0.05] transition-colors"
          style={gridStyle}
        >
          <div className="text-[12px] font-semibold text-slate-300 text-center flex items-center justify-center h-full" style={cellStyle}>
            {analysis.goal}
          </div>
          <div className="text-[12px] font-semibold text-slate-300 text-center flex items-center justify-center h-full" style={cellStyle}>
            {analysis.actual}
          </div>
          <div className="flex items-center justify-center h-full" style={cellStyle}>
            <ProgressBar percentage={analysis.percentageT} />
          </div>
          <div className="text-[12px] font-semibold text-slate-300 text-center flex items-center justify-center h-full" style={cellStyle}>
            {analysis.percentageT}%
          </div>
          <div className="flex items-center justify-center h-full" style={cellStyle}>
            <ProgressBar percentage={analysis.percentageC} />
          </div>
          <div className="text-[12px] font-semibold text-slate-300 text-center flex items-center justify-center h-full">
            {analysis.percentageC}%
          </div>
        </div>
      ))}
    </div>
  );
}
