export interface TopPost {
  post_id: string;
  post_title: string;
  post_type: string;
  total_reads: number;
  unique_readers: number;
  read_rate: number; // Porcentagem de leituras em relação ao total de alunos
  class_name: string | null;
}

export interface ReadRateByType {
  post_type: string;
  total_posts: number;
  total_reads: number;
  avg_read_rate: number;
}

export interface TopReader {
  student_id: string;
  student_name: string;
  class_name: string | null;
  total_reads: number;
}

export interface PostReadAnalytics {
  total_posts_published: number;
  total_reads: number;
  avg_read_rate: number;
  top_posts: TopPost[];
  read_rate_by_type: ReadRateByType[];
  top_readers: TopReader[];
  posts_with_low_engagement: TopPost[];
}
