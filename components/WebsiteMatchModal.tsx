'use client';

interface WebsiteMatchModalProps {
  websiteUrl: string;
  loading: boolean;
  error: string | null;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function WebsiteMatchModal({
  websiteUrl,
  loading,
  error,
  onUrlChange,
  onSubmit,
  onClose,
}: WebsiteMatchModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-[var(--surface)] rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--tag-bg)] transition text-[var(--text-muted)]"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold text-[var(--text)] pr-8">Find Your Art</h2>
        <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
          Paste your website URL and we&apos;ll match it to a museum artwork whose palette fits your brand.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="mt-5 flex flex-col gap-3"
        >
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://yourwebsite.com"
            autoFocus
            className="w-full px-4 py-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
          />
          <button
            type="submit"
            disabled={loading || !websiteUrl.trim()}
            className="w-full py-3 px-4 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Matching…' : 'Match'}
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-500 mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
