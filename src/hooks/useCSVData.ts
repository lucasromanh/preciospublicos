import { useState } from "react";

export function useCSVData<T>() {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCSV = async (url: string, parser: (row: any) => T) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const text = await res.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      const parsed = rows.map((row) => parser(row.split(",")));
      setData(parsed);
    } catch (e) {
      setError("Error al cargar CSV");
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, loadCSV };
}
