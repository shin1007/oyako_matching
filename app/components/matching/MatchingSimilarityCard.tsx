import { ScoreExplanation } from '@/app/components/matching/ScoreExplanation';

interface MatchingSimilarityCardProps {
  score: number;
  label: string;
  userRole: string | null;
  children?: React.ReactNode;
}

export function MatchingSimilarityCard({ score, label, userRole, children }: MatchingSimilarityCardProps) {
  const getBarColor = () => {
    if (userRole === 'child') {
      if (score >= 0.9) return 'bg-child-600';
      if (score >= 0.8) return 'bg-child-500';
      if (score >= 0.7) return 'bg-child-400';
      return 'bg-gray-600';
    } else {
      if (score >= 0.9) return 'bg-green-600';
      if (score >= 0.8) return 'bg-green-500';
      if (score >= 0.7) return 'bg-green-400';
      return 'bg-gray-600';
    }
  };
  const percent = Math.round(score * 100);
  const parentGradient = 'from-green-50 to-green-100 border border-green-200';
  const parentText = 'text-green-700';
  const parentPercent = 'text-green-600';
  return (
    <div
      className={`w-full bg-gradient-to-br p-4 flex flex-col items-center justify-center rounded-lg ${userRole === 'child' ? 'from-child-50 to-child-100 border border-child-100' : parentGradient}`}
      style={userRole === 'child'
        ? { background: 'linear-gradient(135deg, #FFF7F0 0%, #FFF3E0 100%)' }
        : { background: 'linear-gradient(135deg, #F0FFF4 0%, #E6FFFA 100%)' }}
    >
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`text-3xl font-bold ${userRole === 'child' ? 'text-child-600' : parentPercent}`}>{percent}%</div>
          <ScoreExplanation userRole={userRole as 'parent' | 'child'} />
        </div>
        <div className={`text-xs font-bold ${userRole === 'child' ? 'text-gray-900' : parentText}`}>類似度</div>
        <div className={`text-xs mt-1 ${userRole === 'child' ? 'text-gray-500' : parentText}`}>{label}</div>
      </div>
      <div className="w-full h-1 bg-gray-300 rounded-full mb-3 overflow-hidden">
        <div className={`h-full rounded-full ${getBarColor()}`} style={{ width: `${percent}%` }} />
      </div>
      {children}
    </div>
  );
}
