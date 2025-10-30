import { TopPost } from '@/types/post-read-analytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Users, TrendingUp } from 'lucide-react';

interface TopPostsTableProps {
  posts: TopPost[];
  title: string;
  emptyMessage?: string;
}

export function TopPostsTable({ posts, title, emptyMessage = 'Nenhum post encontrado' }: TopPostsTableProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Post</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Eye className="h-4 w-4" />
                Leituras
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Leitores
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Taxa
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow key={post.post_id}>
              <TableCell className="font-medium max-w-xs truncate">
                {post.post_title}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{post.post_type}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {post.class_name || 'Global'}
              </TableCell>
              <TableCell className="text-center font-medium">
                {post.total_reads}
              </TableCell>
              <TableCell className="text-center font-medium">
                {post.unique_readers}
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={post.read_rate >= 70 ? 'default' : post.read_rate >= 40 ? 'secondary' : 'destructive'}
                  className="font-semibold"
                >
                  {post.read_rate}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
