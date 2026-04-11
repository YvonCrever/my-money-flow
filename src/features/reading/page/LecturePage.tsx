import { useAppPageChrome } from '@/components/AppChromeProvider';
import { FeatureLoadWarning } from '@/components/FeatureLoadWarning';
import { ReadingTab } from '@/components/ReadingTab';
import useReadingData from '@/hooks/useReadingData';

export default function LecturePage() {
  const readingData = useReadingData();
  const { inlineToolsTarget } = useAppPageChrome('lecture');

  return (
    <div className="page-workspace">
      {readingData.loadError ? (
        <FeatureLoadWarning
          title="Probleme de stockage de la Lecture"
          description={readingData.loadError}
          className="mb-5"
        />
      ) : null}

      <ReadingTab
        books={readingData.books}
        onAdd={readingData.addBook}
        onEdit={readingData.editBook}
        onDelete={readingData.deleteBook}
        toolbarPortalTarget={inlineToolsTarget ?? null}
      />
    </div>
  );
}
