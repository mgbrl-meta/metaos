import { useCallback, useState } from "react";

export function useExpandedRows() {
  const [openId, setOpenId] = useState("");

  const toggleRow = useCallback((id: string) => {
    setOpenId(prev => (prev === id ? "" : id));
  }, []);

  return { openId, toggleRow };
}
