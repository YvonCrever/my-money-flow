import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BookOpen, Check, Pencil, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';

import {
  FinanceMetricWidget,
  FinanceWidgetBoard,
  FinanceWidgetShell,
  type FinanceWidgetDefinition,
} from '@/components/finance/FinanceWidgetBoard';
import { FinanceLegendList, FinanceWidgetEmptyState } from '@/components/finance/financeUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import { WorkspacePlusButton } from '@/components/ui/workspace-plus-button';
import { useToast } from '@/hooks/use-toast';
import { CHART_PALETTE, chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { BOOK_CATEGORIES, BookCategory, ReadingEntry } from '@/types/reading';

interface ReadingTabProps {
  books: ReadingEntry[];
  onAdd: (entry: Omit<ReadingEntry, 'id' | 'addedAt'>) => void;
  onEdit: (id: string, updated: Partial<Omit<ReadingEntry, 'id' | 'addedAt'>>) => void;
  onDelete: (id: string) => void;
  toolbarPortalTarget?: HTMLDivElement | null;
}

function formatRating(value: number) {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`;
}

function formatAddedDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatBookCount(value: number) {
  return `${value.toLocaleString('fr-FR')} livre${value > 1 ? 's' : ''}`;
}

function RatingStars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));
        return (
          <span key={index} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 h-full w-full text-white/10" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-full w-full fill-[#fcd34d] text-[#fcd34d]" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function SingleStar({ fill, size = 24 }: { fill: number; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <Star className="absolute inset-0 h-full w-full text-white/10" />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <Star className="h-full w-full fill-[#fcd34d] text-[#fcd34d]" />
      </span>
    </span>
  );
}

function RatingInput({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const starSize = compact ? 20 : 24;
  const hitSize = compact ? 24 : 32;

  return (
    <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const starValue = index + 1;
          return (
            <div key={index} className="relative" style={{ width: hitSize, height: hitSize }}>
              <button
                type="button"
                aria-label={`Donner ${index + 0.5} étoile`}
                className="absolute inset-y-0 left-0 z-10 w-1/2"
                onClick={() => onChange(index + 0.5)}
              />
              <button
                type="button"
                aria-label={`Donner ${starValue} étoiles`}
                className="absolute inset-y-0 right-0 z-10 w-1/2"
                onClick={() => onChange(starValue)}
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <SingleStar fill={Math.max(0, Math.min(1, value - index))} size={starSize} />
              </span>
            </div>
          );
        })}
      </div>
      {!compact ? <span className="font-mono-num text-sm text-slate-300">{formatRating(value)}</span> : null}
    </div>
  );
}

function ReadingBookList({
  books,
  emptyMessage,
}: {
  books: ReadingEntry[];
  emptyMessage: string;
}) {
  if (books.length === 0) {
    return <FinanceWidgetEmptyState message={emptyMessage} />;
  }

  return (
    <div className="reading-widget-book-list">
      {books.map((book) => (
        <article key={book.id} className="reading-widget-book-card">
          <div className="reading-widget-book-main">
            <div className="reading-widget-book-meta">
              <p className="reading-widget-book-title cell-truncate" title={book.title}>
                {book.title}
              </p>
              <p className="reading-widget-book-subtitle cell-truncate" title={book.author}>
                {book.author}
              </p>
            </div>
            <div className="reading-widget-inline-rating">
              <RatingStars value={book.rating} size={15} />
              <span className="font-mono-num text-xs text-slate-300">{formatRating(book.rating)}</span>
            </div>
          </div>
          <div className="reading-widget-book-footer">
            <span className="cell-truncate" title={book.category}>
              {book.category}
            </span>
            <span>{formatAddedDate(book.addedAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ReadingTab({ books, onAdd, onEdit, onDelete, toolbarPortalTarget }: ReadingTabProps) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<BookCategory>('Roman');
  const [rating, setRating] = useState(3.5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Omit<ReadingEntry, 'id' | 'addedAt'>>>({});

  const handleAdd = (event?: React.FormEvent) => {
    event?.preventDefault();
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();

    if (!cleanTitle || !cleanAuthor || rating < 0.5) {
      toast({
        title: 'Informations manquantes',
        description: 'Renseigne au moins le titre, l’auteur et une note.',
      });
      return;
    }

    onAdd({
      title: cleanTitle,
      author: cleanAuthor,
      category,
      rating,
    });

    setTitle('');
    setAuthor('');
    setCategory('Roman');
    setRating(3.5);
    setIsAddOpen(false);
    toast({
      title: 'Livre ajouté',
      description: `${cleanTitle} a été ajouté à ta bibliothèque.`,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleAdd();
  };

  const startEdit = (book: ReadingEntry) => {
    setEditingId(book.id);
    setEditFields({
      title: book.title,
      author: book.author,
      category: book.category,
      rating: book.rating,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFields({});
  };

  const saveEdit = (id: string) => {
    onEdit(id, {
      title: editFields.title,
      author: editFields.author,
      category: editFields.category as BookCategory | undefined,
      rating: editFields.rating,
    });
    cancelEdit();
  };

  const totalBooks = books.length;
  const averageRating = totalBooks ? books.reduce((sum, book) => sum + book.rating, 0) / totalBooks : 0;
  const favoriteBooksCount = books.filter((book) => book.rating >= 4.5).length;

  const categoryPieData = useMemo(() => {
    const totals = new Map<string, number>();
    books.forEach((book) => {
      totals.set(book.category, (totals.get(book.category) ?? 0) + 1);
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }, [books]);

  const ratingDistribution = useMemo(() => {
    const buckets = new Map<number, number>();
    for (let score = 0.5; score <= 5; score += 0.5) {
      buckets.set(score, 0);
    }
    books.forEach((book) => {
      buckets.set(book.rating, (buckets.get(book.rating) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([score, count]) => ({
      label: score.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      count,
    }));
  }, [books]);

  const authorLeaderboard = useMemo(() => {
    const totals = new Map<string, number>();
    books.forEach((book) => {
      totals.set(book.author, (totals.get(book.author) ?? 0) + 1);
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [books]);
  const authorCount = useMemo(() => new Set(books.map((book) => book.author)).size, [books]);

  const topCategory = categoryPieData[0];
  const topAuthor = authorLeaderboard[0];
  const topRatedBooks = useMemo(
    () => books.slice().sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title)).slice(0, 5),
    [books],
  );
  const latestBooks = useMemo(
    () => books.slice().sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 5),
    [books],
  );

  const widgets = useMemo<FinanceWidgetDefinition[]>(() => [
    {
      id: 'reading-total-books',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 4,
      node: (
        <FinanceMetricWidget
          kicker="Bibliothèque"
          title="Livres enregistrés"
          value={totalBooks.toLocaleString('fr-FR')}
          detail={topAuthor ? `${authorCount} auteur${authorCount > 1 ? 's' : ''} suivi${authorCount > 1 ? 's' : ''}` : 'Ajoute un livre pour démarrer'}
          footer={topAuthor ? `Auteur dominant: ${topAuthor.name}` : 'Aucun auteur récurrent'}
          icon={<BookOpen className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'reading-average-rating',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 4,
      node: (
        <FinanceMetricWidget
          kicker="Appréciation"
          title="Note moyenne"
          value={averageRating > 0 ? formatRating(averageRating) : '—'}
          detail={totalBooks > 0 ? `${formatBookCount(totalBooks)} noté${totalBooks > 1 ? 's' : ''}` : 'Aucune note enregistrée'}
          footer="Moyenne de toutes les notes de lecture"
          icon={<Star className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'reading-top-category',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 4,
      node: (
        <FinanceMetricWidget
          kicker="Dominante"
          title="Genre principal"
          value={topCategory?.name ?? '—'}
          detail={topCategory ? formatBookCount(topCategory.value) : 'Aucune catégorie dominante'}
          footer={categoryPieData.length > 0 ? `${categoryPieData.length} catégorie${categoryPieData.length > 1 ? 's' : ''} suivie${categoryPieData.length > 1 ? 's' : ''}` : 'Aucune catégorie disponible'}
          icon={<Sparkles className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'reading-favorites',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 4,
      node: (
        <FinanceMetricWidget
          kicker="Sélection"
          title="Coups de coeur"
          value={favoriteBooksCount.toLocaleString('fr-FR')}
          detail={favoriteBooksCount > 0 ? 'Notes de 4,5 / 5 et plus' : 'Aucun favori pour le moment'}
          footer={topRatedBooks[0] ? `Meilleure lecture: ${topRatedBooks[0].title}` : 'Les meilleures notes apparaîtront ici'}
          icon={<BookOpen className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'reading-categories',
      defaultW: 6,
      defaultH: 11,
      minH: 9,
      node: (
        <FinanceWidgetShell kicker="Répartition" title="Genres les plus lus" icon={<Sparkles className="h-4 w-4" />}>
          {categoryPieData.length === 0 ? (
            <FinanceWidgetEmptyState message="Ajoute des livres pour afficher la répartition par genre." />
          ) : (
            <div className="finance-widget-split finance-widget-split--chart">
              <div className="finance-widget-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatBookCount(value)} contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <FinanceLegendList
                items={categoryPieData}
                formatter={(value) => formatBookCount(value)}
                emptyMessage="Ajoute des livres pour afficher la répartition."
                maxItems={6}
              />
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'reading-ratings',
      defaultW: 6,
      defaultH: 10,
      minH: 9,
      node: (
        <FinanceWidgetShell kicker="Notation" title="Distribution des notes" icon={<Star className="h-4 w-4" />}>
          {books.length === 0 ? (
            <FinanceWidgetEmptyState message="Ajoute des livres pour voir la distribution des notes." />
          ) : (
            <div className="finance-widget-chart finance-widget-chart--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatBookCount(value)} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="url(#readingRatingsWidget)" radius={[10, 10, 0, 0]} />
                  <defs>
                    <linearGradient id="readingRatingsWidget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'reading-authors',
      defaultW: 4,
      defaultH: 9,
      minH: 8,
      node: (
        <FinanceWidgetShell kicker="Auteurs" title="Plumes récurrentes" icon={<BookOpen className="h-4 w-4" />}>
          {authorLeaderboard.length === 0 ? (
            <FinanceWidgetEmptyState message="Ajoute des livres pour suivre les auteurs récurrents." />
          ) : (
            <div className="finance-widget-ranking">
              {authorLeaderboard.map((entry) => {
                const maxValue = authorLeaderboard[0]?.value ?? 1;
                const width = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;

                return (
                  <div key={entry.name} className="finance-widget-ranking-item">
                    <div className="finance-widget-ranking-header">
                      <span className="cell-truncate" title={entry.name}>{entry.name}</span>
                      <span className="finance-number">{formatBookCount(entry.value)}</span>
                    </div>
                    <div className="finance-widget-ranking-bar">
                      <span style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'reading-top-rated',
      defaultW: 4,
      defaultH: 11,
      minH: 9,
      node: (
        <FinanceWidgetShell kicker="Sélection" title="Lectures marquantes" icon={<Sparkles className="h-4 w-4" />}>
          <ReadingBookList
            books={topRatedBooks}
            emptyMessage="Aucune lecture enregistrée pour le moment."
          />
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'reading-latest',
      defaultW: 4,
      defaultH: 11,
      minH: 9,
      node: (
        <FinanceWidgetShell kicker="Récents" title="Derniers ajouts" icon={<BookOpen className="h-4 w-4" />}>
          <ReadingBookList
            books={latestBooks}
            emptyMessage="Les derniers livres ajoutés apparaîtront ici."
          />
        </FinanceWidgetShell>
      ),
    },
  ], [
    authorCount,
    authorLeaderboard,
    averageRating,
    books.length,
    categoryPieData,
    favoriteBooksCount,
    latestBooks,
    topAuthor,
    topCategory,
    topRatedBooks,
    totalBooks,
  ]);

  const listPanel = (
    <div className="surface-panel workspace-table-shell workspace-table-shell--compact finance-list-shell">
      <Table className="workspace-table-compact finance-list-table finance-list-table--reading">
        <TableHeader>
          <TableRow className="border-white/6 bg-white/[0.03]">
            <TableHead className="text-slate-400">Titre</TableHead>
            <TableHead className="text-slate-400">Auteur</TableHead>
            <TableHead className="text-slate-400">Catégorie</TableHead>
            <TableHead className="text-slate-400">Note</TableHead>
            <TableHead className="text-slate-400">Ajouté</TableHead>
            <TableHead className="w-[74px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                Aucun livre enregistré pour le moment
              </TableCell>
            </TableRow>
          ) : books.map((book) => {
            const isEditing = editingId === book.id;

            return (
              <TableRow key={book.id} className="border-white/6 hover:bg-white/[0.03]">
                <TableCell className="align-top">
                  {isEditing ? (
                    <Input
                      value={editFields.title ?? ''}
                      onChange={(event) => setEditFields((fields) => ({ ...fields, title: event.target.value }))}
                      className="w-full"
                    />
                  ) : (
                    <span className="cell-truncate finance-reading-title-text font-medium text-slate-100" title={book.title}>
                      {book.title}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {isEditing ? (
                    <Input
                      value={editFields.author ?? ''}
                      onChange={(event) => setEditFields((fields) => ({ ...fields, author: event.target.value }))}
                      className="w-full"
                    />
                  ) : (
                    <span className="cell-truncate finance-reading-author-text text-slate-300" title={book.author}>
                      {book.author}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {isEditing ? (
                    <select
                      className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                      value={(editFields.category as BookCategory | undefined) ?? book.category}
                      onChange={(event) => setEditFields((fields) => ({ ...fields, category: event.target.value as BookCategory }))}
                    >
                      {BOOK_CATEGORIES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="cell-badge finance-reading-category-badge" title={book.category}>
                      {book.category}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {isEditing ? (
                    <div className="finance-reading-rating-editor">
                      <RatingInput
                        value={typeof editFields.rating === 'number' ? editFields.rating : book.rating}
                        onChange={(value) => setEditFields((fields) => ({ ...fields, rating: value }))}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="finance-reading-rating-cell">
                      <RatingStars value={book.rating} size={15} />
                      <span className="font-mono-num text-xs text-slate-300">{formatRating(book.rating)}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top text-slate-400">{formatAddedDate(book.addedAt)}</TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-white/10 bg-white/5" onClick={() => saveEdit(book.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full border border-white/10 bg-white/5" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => startEdit(book)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-destructive" onClick={() => onDelete(book.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const addButton = (
    <WorkspacePlusButton
      onClick={() => setIsAddOpen(true)}
      label="Ajouter"
      showLabel
      surface={toolbarPortalTarget ? 'masthead' : 'default'}
    />
  );

  return (
    <div className="finance-scope reading-scope space-y-4">
      {toolbarPortalTarget !== undefined ? (
        toolbarPortalTarget ? (
          <ToolbarPortal target={toolbarPortalTarget}>
            {addButton}
          </ToolbarPortal>
        ) : null
      ) : (
        <div className="flex justify-end">
          {addButton}
        </div>
      )}

      <WorkspacePopup
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Ajouter un livre"
        className="max-w-[min(92vw,38rem)]"
      >
        <form onSubmit={handleAdd} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Titre</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={handleKeyDown} placeholder="Milarepa" className="h-9" />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Auteur</span>
              <Input value={author} onChange={(event) => setAuthor(event.target.value)} onKeyDown={handleKeyDown} placeholder="M. Schmitt" className="h-9" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Catégorie</span>
              <select
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value as BookCategory)}
              >
                {BOOK_CATEGORIES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Note</span>
              <div className="flex min-h-9 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3">
                <RatingInput value={rating} onChange={setRating} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-4">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </form>
      </WorkspacePopup>

      <FinanceWidgetBoard
        storageScope="reading-books-widgets-v1"
        widgets={widgets}
        emptyMessage="Tous les visuels de lecture sont masqués."
        anchor={{
          id: 'reading-list-anchor',
          node: listPanel,
          minRows: 18,
          lg: { w: 6 },
          md: { w: 5 },
          sm: { w: 4 },
        }}
      />
    </div>
  );
}
